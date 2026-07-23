import { spawn, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { Server } from 'http';
import { dirname } from 'path';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { applyVpsRuntimeConfiguration } from '../vpsConfiguration';
import type {
    AgentProjectRuntimeInfo,
    AgentProjectRuntimeMode,
    AgentProjectRuntimeStatus,
} from './AgentProjectRuntimeInfo';
import {
    AGENT_PROJECT_RUNTIME_COMMAND_MAX_LENGTH,
    AGENT_PROJECT_RUNTIME_DEFAULT_DEV_COMMAND,
    AGENT_PROJECT_RUNTIME_HOST,
    AGENT_PROJECT_RUNTIME_START_POLL_INTERVAL_MS,
    AGENT_PROJECT_RUNTIME_START_TIMEOUT_MS,
} from './agentProjectRuntimeConstants';
import {
    assignAgentProjectDomain,
    resolveAgentProjectDomainRecord,
    resolveAgentProjectDomainRecordByHost,
    type AgentProjectDomainAssignment,
} from './agentProjectRuntimeDomains';
import { buildAgentProjectProfileHref } from './agentProjectHrefs';
import {
    isAgentProjectRuntimePm2Enabled,
    resolveAgentProjectRuntimePm2Status,
    startAgentProjectRuntimePm2Process,
    stopAgentProjectRuntimePm2Process,
} from './agentProjectRuntimePm2';
import { resolveAgentProjectRuntimeRegistryFilePath } from './agentProjectRuntimePaths';
import { createStaticAgentProjectServer } from './createStaticAgentProjectServer';
import { findFreeTcpPort } from './findFreeTcpPort';
import { isTcpPortListening, waitForTcpPortListening } from './isTcpPortListening';
import { killProcessListeningOnPort } from './killProcessListeningOnPort';
import { resolveAgentProjectInfo } from './resolveAgentProjectInfo';

/**
 * Global key used to keep project runtimes alive across module reloads.
 */
const AGENT_PROJECT_RUNTIME_REGISTRY_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_RUNTIME_REGISTRY__';

/**
 * Current persisted runtime registry schema version.
 */
const AGENT_PROJECT_RUNTIME_REGISTRY_VERSION = 1;

/**
 * Placeholder replaced with the assigned port in custom dev commands.
 */
const DEV_COMMAND_PORT_PLACEHOLDER = '{port}';

/**
 * Placeholder replaced with the local runtime host in custom dev commands.
 */
const DEV_COMMAND_HOST_PLACEHOLDER = '{host}';

/**
 * Project runtime registry stored on `globalThis`.
 */
type AgentProjectRuntimeRegistryState = {
    /**
     * Runtime records keyed by runtime id.
     */
    runtimesById: Map<string, MutableAgentProjectRuntimeRecord>;

    /**
     * Whether the persisted registry has already been loaded into memory.
     */
    isLoaded: boolean;
};

/**
 * Global object shape used for process-wide runtime state.
 */
type AgentProjectRuntimeRegistryGlobal = typeof globalThis & {
    [AGENT_PROJECT_RUNTIME_REGISTRY_GLOBAL_KEY]?: AgentProjectRuntimeRegistryState;
};

/**
 * Mutable internal runtime record.
 */
type MutableAgentProjectRuntimeRecord = {
    id: string;
    agentPermanentId: string;
    projectName: string;
    projectPath: string;
    mode: AgentProjectRuntimeMode;
    port: number;
    url: string;
    localUrl: string;
    publicUrl: string;
    domain: string | null;
    projectHref: string;
    command: string | null;
    processId: number | null;
    pm2ProcessName: string | null;
    status: AgentProjectRuntimeStatus;
    isRunning: boolean;
    startedAt: string;
    updatedAt: string;
    staticServer?: Server;
    childProcess?: ChildProcess;
};

/**
 * Persisted runtime registry shape.
 */
type PersistedAgentProjectRuntimeRegistry = {
    readonly version: number;
    readonly runtimes: ReadonlyArray<PersistedAgentProjectRuntimeRecord>;
};

/**
 * Persisted subset of a mutable runtime record.
 */
type PersistedAgentProjectRuntimeRecord = Omit<MutableAgentProjectRuntimeRecord, 'staticServer' | 'childProcess'>;

/**
 * Options identifying one agent project.
 */
type AgentProjectRuntimeProjectOptions = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Optional base server domain selected by the request that triggered the runtime.
     */
    readonly serverDomain?: string | null;
};

/**
 * Options for starting a server-owned dev runtime.
 */
export type StartAgentProjectDevRuntimeOptions = AgentProjectRuntimeProjectOptions & {
    /**
     * Optional shell command. `{port}` and `{host}` placeholders are replaced before execution.
     */
    readonly command?: string;
};

/**
 * Runtime start preparation shared by dev and static runtimes.
 */
type PreparedAgentProjectRuntimeStart = {
    readonly project: NonNullable<Awaited<ReturnType<typeof resolveAgentProjectInfo>>>;
    readonly port: number;
    readonly localUrl: string;
    readonly publicUrl: string;
    readonly domain: string | null;
    readonly domainAssignment: AgentProjectDomainAssignment;
};

/**
 * Assigns a free local port to one project without starting a server-owned process.
 *
 * Agents use this when they need to run their own dev command but still want the Agents
 * Server to track and later terminate the port.
 *
 * @param options - Agent and project identification.
 * @returns Runtime info for the assigned port.
 */
export async function assignAgentProjectPort(
    options: AgentProjectRuntimeProjectOptions,
): Promise<AgentProjectRuntimeInfo> {
    await hydrateAgentProjectRuntimeRegistryState();

    const existingRuntimeRecord = findAgentProjectRuntimeRecord(options.agentPermanentId, options.projectName);

    if (existingRuntimeRecord) {
        await refreshAgentProjectRuntimeRecord(existingRuntimeRecord);
        await persistAgentProjectRuntimeRegistryState();
        return toAgentProjectRuntimeInfo(existingRuntimeRecord);
    }

    const project = await resolveExistingAgentProject(options);
    const port = await findFreeTcpPort();
    const localUrl = createAgentProjectRuntimeLocalUrl(port);
    const domainAssignment = await assignAgentProjectDomain({
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        serverDomain: options.serverDomain,
    });
    const publicUrl = domainAssignment.record?.publicUrl ?? localUrl;
    const now = new Date().toISOString();
    const runtimeRecord: MutableAgentProjectRuntimeRecord = {
        id: createAgentProjectRuntimeId(),
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        projectPath: project.absolutePath,
        mode: 'assigned-port',
        port,
        url: publicUrl,
        localUrl,
        publicUrl,
        domain: domainAssignment.record?.domain ?? null,
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        command: null,
        processId: null,
        pm2ProcessName: null,
        status: 'assigned',
        isRunning: false,
        startedAt: now,
        updatedAt: now,
    };

    getAgentProjectRuntimeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);
    await persistAgentProjectRuntimeRegistryState();
    await applyAgentProjectRuntimePublicConfiguration(domainAssignment);
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Starts a server-owned static file server for one project.
 *
 * @param options - Agent and project identification.
 * @returns Runtime info for the static server.
 */
export async function startAgentProjectStaticRuntime(
    options: AgentProjectRuntimeProjectOptions,
): Promise<AgentProjectRuntimeInfo> {
    await hydrateAgentProjectRuntimeRegistryState();

    const preparedStart = await prepareAgentProjectRuntimeStart(options);
    const now = new Date().toISOString();
    const runtimeRecord = createMutableAgentProjectRuntimeRecord({
        agentPermanentId: options.agentPermanentId,
        command: null,
        domain: preparedStart.domain,
        localUrl: preparedStart.localUrl,
        mode: 'static-server',
        port: preparedStart.port,
        projectName: preparedStart.project.projectName,
        projectPath: preparedStart.project.absolutePath,
        publicUrl: preparedStart.publicUrl,
        startedAt: now,
        status: 'starting',
    });

    if (isAgentProjectRuntimePm2Enabled()) {
        await startPm2ManagedAgentProjectRuntime(runtimeRecord);
    } else {
        await startInProcessStaticAgentProjectRuntime(runtimeRecord);
    }

    getAgentProjectRuntimeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);
    await refreshAgentProjectRuntimeRecord(runtimeRecord);
    await persistAgentProjectRuntimeRegistryState();
    await applyAgentProjectRuntimePublicConfiguration(preparedStart.domainAssignment);
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Starts a server-owned dev command for one project.
 *
 * @param options - Agent, project, and optional command.
 * @returns Runtime info for the dev server.
 */
export async function startAgentProjectDevRuntime(
    options: StartAgentProjectDevRuntimeOptions,
): Promise<AgentProjectRuntimeInfo> {
    await hydrateAgentProjectRuntimeRegistryState();

    const preparedStart = await prepareAgentProjectRuntimeStart(options);
    const command = normalizeDevCommand(options.command, preparedStart.port);
    const now = new Date().toISOString();
    const runtimeRecord = createMutableAgentProjectRuntimeRecord({
        agentPermanentId: options.agentPermanentId,
        command,
        domain: preparedStart.domain,
        localUrl: preparedStart.localUrl,
        mode: 'dev-server',
        port: preparedStart.port,
        projectName: preparedStart.project.projectName,
        projectPath: preparedStart.project.absolutePath,
        publicUrl: preparedStart.publicUrl,
        startedAt: now,
        status: 'starting',
    });

    if (isAgentProjectRuntimePm2Enabled()) {
        await startPm2ManagedAgentProjectRuntime(runtimeRecord);
    } else {
        startChildProcessAgentProjectDevRuntime(runtimeRecord);
    }

    getAgentProjectRuntimeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);

    const isListening = await waitForTcpPortListening({
        port: runtimeRecord.port,
        host: AGENT_PROJECT_RUNTIME_HOST,
        timeoutMs: AGENT_PROJECT_RUNTIME_START_TIMEOUT_MS,
        pollIntervalMs: AGENT_PROJECT_RUNTIME_START_POLL_INTERVAL_MS,
    });

    if (isListening) {
        runtimeRecord.status = 'running';
        runtimeRecord.isRunning = true;
        runtimeRecord.updatedAt = new Date().toISOString();
    }

    await refreshAgentProjectRuntimeRecord(runtimeRecord);
    await persistAgentProjectRuntimeRegistryState();
    await applyAgentProjectRuntimePublicConfiguration(preparedStart.domainAssignment);
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Resolves one project runtime by agent and project.
 *
 * @param agentPermanentId - Permanent id of the agent owning the project.
 * @param projectName - Project directory name.
 * @returns Runtime info or `null`.
 */
export async function resolveAgentProjectRuntime(
    agentPermanentId: string,
    projectName: string,
): Promise<AgentProjectRuntimeInfo | null> {
    await hydrateAgentProjectRuntimeRegistryState();

    const runtimeRecord = findAgentProjectRuntimeRecord(agentPermanentId, projectName);

    if (!runtimeRecord) {
        return null;
    }

    await refreshAgentProjectRuntimeRecord(runtimeRecord);
    await persistAgentProjectRuntimeRegistryState();
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Refreshes the public URL/domain fields of an existing runtime after a project-domain assignment changes.
 *
 * @param options - Project identity and server domain whose assignment should be reflected.
 * @returns Updated runtime info or `null` when the project has no runtime.
 */
export async function refreshAgentProjectRuntimePublicDomain(
    options: AgentProjectRuntimeProjectOptions,
): Promise<AgentProjectRuntimeInfo | null> {
    await hydrateAgentProjectRuntimeRegistryState();

    const runtimeRecord = findAgentProjectRuntimeRecord(options.agentPermanentId, options.projectName);

    if (!runtimeRecord) {
        return null;
    }

    const domainRecord = await resolveAgentProjectDomainRecord({
        agentPermanentId: options.agentPermanentId,
        projectName: runtimeRecord.projectName,
        serverDomain: options.serverDomain,
    });
    const publicUrl = domainRecord?.publicUrl ?? runtimeRecord.localUrl;

    runtimeRecord.domain = domainRecord?.domain ?? null;
    runtimeRecord.publicUrl = publicUrl;
    runtimeRecord.url = publicUrl;
    runtimeRecord.updatedAt = new Date().toISOString();

    await refreshAgentProjectRuntimeRecord(runtimeRecord);
    await persistAgentProjectRuntimeRegistryState();
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Resolves one running project runtime by public project-domain host.
 *
 * @param host - Raw request host.
 * @returns Runtime info or `null`.
 */
export async function resolveAgentProjectRuntimeByDomain(
    host: string | null | undefined,
): Promise<AgentProjectRuntimeInfo | null> {
    const domainRecord = await resolveAgentProjectDomainRecordByHost(host);

    if (!domainRecord) {
        return null;
    }

    return await resolveAgentProjectRuntime(domainRecord.agentPermanentId, domainRecord.projectName);
}

/**
 * Lists all assigned project runtimes.
 *
 * @returns Runtime infos ordered by start time.
 */
export async function listAgentProjectRuntimes(): Promise<ReadonlyArray<AgentProjectRuntimeInfo>> {
    await hydrateAgentProjectRuntimeRegistryState();

    const runtimeRecords = [...getAgentProjectRuntimeRegistryState().runtimesById.values()];

    await Promise.all(runtimeRecords.map((runtimeRecord) => refreshAgentProjectRuntimeRecord(runtimeRecord)));
    await persistAgentProjectRuntimeRegistryState();

    return runtimeRecords
        .map((runtimeRecord) => toAgentProjectRuntimeInfo(runtimeRecord))
        .sort((firstRuntime, secondRuntime) => firstRuntime.startedAt.localeCompare(secondRuntime.startedAt));
}

/**
 * Terminates one runtime by runtime id.
 *
 * @param runtimeId - Runtime id.
 * @returns Terminated runtime info or `null` when it no longer exists.
 */
export async function terminateAgentProjectRuntimeById(runtimeId: string): Promise<AgentProjectRuntimeInfo | null> {
    await hydrateAgentProjectRuntimeRegistryState();

    const runtimeRecord = getAgentProjectRuntimeRegistryState().runtimesById.get(runtimeId);

    if (!runtimeRecord) {
        return null;
    }

    await terminateAgentProjectRuntimeRecord(runtimeRecord);
    getAgentProjectRuntimeRegistryState().runtimesById.delete(runtimeId);
    await persistAgentProjectRuntimeRegistryState();
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Terminates any runtime assigned to one project.
 *
 * @param options - Agent and project identification.
 * @returns Terminated runtime info or `null` when no runtime exists.
 */
export async function terminateAgentProjectRuntimeForProject(
    options: AgentProjectRuntimeProjectOptions,
): Promise<AgentProjectRuntimeInfo | null> {
    await hydrateAgentProjectRuntimeRegistryState();

    const runtimeRecord = findAgentProjectRuntimeRecord(options.agentPermanentId, options.projectName);

    if (!runtimeRecord) {
        return null;
    }

    await terminateAgentProjectRuntimeRecord(runtimeRecord);
    getAgentProjectRuntimeRegistryState().runtimesById.delete(runtimeRecord.id);
    await persistAgentProjectRuntimeRegistryState();
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Terminates all project runtimes in the current process.
 *
 * This is used by tests and process-level cleanup.
 */
export async function terminateAllAgentProjectRuntimes(): Promise<void> {
    await hydrateAgentProjectRuntimeRegistryState();

    const runtimeIds = [...getAgentProjectRuntimeRegistryState().runtimesById.keys()];

    await Promise.all(runtimeIds.map((runtimeId) => terminateAgentProjectRuntimeById(runtimeId)));
}

/**
 * Prepares common runtime start metadata and terminates any previous runtime.
 */
async function prepareAgentProjectRuntimeStart(
    options: AgentProjectRuntimeProjectOptions,
): Promise<PreparedAgentProjectRuntimeStart> {
    const project = await resolveExistingAgentProject(options);

    await terminateAgentProjectRuntimeForProject({
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
    });

    const port = await findFreeTcpPort();
    const localUrl = createAgentProjectRuntimeLocalUrl(port);
    const domainAssignment = await assignAgentProjectDomain({
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        serverDomain: options.serverDomain,
    });
    const publicUrl = domainAssignment.record?.publicUrl ?? localUrl;

    return {
        project,
        port,
        localUrl,
        publicUrl,
        domain: domainAssignment.record?.domain ?? null,
        domainAssignment,
    };
}

/**
 * Creates an initial mutable runtime record.
 */
function createMutableAgentProjectRuntimeRecord(options: {
    readonly agentPermanentId: string;
    readonly command: string | null;
    readonly domain: string | null;
    readonly localUrl: string;
    readonly mode: AgentProjectRuntimeMode;
    readonly port: number;
    readonly projectName: string;
    readonly projectPath: string;
    readonly publicUrl: string;
    readonly startedAt: string;
    readonly status: AgentProjectRuntimeStatus;
}): MutableAgentProjectRuntimeRecord {
    return {
        id: createAgentProjectRuntimeId(),
        agentPermanentId: options.agentPermanentId,
        projectName: options.projectName,
        projectPath: options.projectPath,
        mode: options.mode,
        port: options.port,
        url: options.publicUrl,
        localUrl: options.localUrl,
        publicUrl: options.publicUrl,
        domain: options.domain,
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, options.projectName),
        command: options.command,
        processId: null,
        pm2ProcessName: null,
        status: options.status,
        isRunning: false,
        startedAt: options.startedAt,
        updatedAt: options.startedAt,
    };
}

/**
 * Starts a pm2-managed project runtime.
 */
async function startPm2ManagedAgentProjectRuntime(runtimeRecord: MutableAgentProjectRuntimeRecord): Promise<void> {
    if (runtimeRecord.mode !== 'dev-server' && runtimeRecord.mode !== 'static-server') {
        return;
    }

    try {
        const processResult = await startAgentProjectRuntimePm2Process({
            agentPermanentId: runtimeRecord.agentPermanentId,
            projectName: runtimeRecord.projectName,
            projectPath: runtimeRecord.projectPath,
            mode: runtimeRecord.mode,
            port: runtimeRecord.port,
            command: runtimeRecord.command,
            publicUrl: runtimeRecord.publicUrl,
            localUrl: runtimeRecord.localUrl,
        });

        runtimeRecord.pm2ProcessName = processResult.processName;
        runtimeRecord.processId = processResult.processId;
        runtimeRecord.updatedAt = new Date().toISOString();
    } catch (error) {
        throw new NotAllowed(
            spaceTrim(`
                Failed to start project \`${runtimeRecord.projectName}\` as a pm2 process.

                **Project path:** \`${runtimeRecord.projectPath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Starts the local in-process static server used outside production pm2.
 */
async function startInProcessStaticAgentProjectRuntime(runtimeRecord: MutableAgentProjectRuntimeRecord): Promise<void> {
    const staticServer = createStaticAgentProjectServer(runtimeRecord.projectPath);

    await listenOnPort(staticServer, runtimeRecord.port);

    runtimeRecord.staticServer = staticServer;
    runtimeRecord.status = 'running';
    runtimeRecord.isRunning = true;
    runtimeRecord.updatedAt = new Date().toISOString();

    staticServer.once('close', () => {
        runtimeRecord.status = 'stopped';
        runtimeRecord.isRunning = false;
        runtimeRecord.updatedAt = new Date().toISOString();
        void persistAgentProjectRuntimeRegistryState();
    });
}

/**
 * Starts the local child-process dev runtime used outside production pm2.
 */
function startChildProcessAgentProjectDevRuntime(runtimeRecord: MutableAgentProjectRuntimeRecord): void {
    const childProcess = spawn(runtimeRecord.command || AGENT_PROJECT_RUNTIME_DEFAULT_DEV_COMMAND, {
        cwd: runtimeRecord.projectPath,
        detached: false,
        env: {
            ...process.env,
            HOST: AGENT_PROJECT_RUNTIME_HOST,
            HOSTNAME: AGENT_PROJECT_RUNTIME_HOST,
            PORT: String(runtimeRecord.port),
            PTBK_AGENT_PROJECT_LOCAL_URL: runtimeRecord.localUrl,
            PTBK_AGENT_PROJECT_PUBLIC_URL: runtimeRecord.publicUrl,
        },
        shell: true,
        stdio: 'ignore',
        windowsHide: true,
    });

    runtimeRecord.childProcess = childProcess;
    runtimeRecord.processId = childProcess.pid ?? null;

    childProcess.once('exit', () => {
        runtimeRecord.status = 'stopped';
        runtimeRecord.isRunning = false;
        runtimeRecord.updatedAt = new Date().toISOString();
        void persistAgentProjectRuntimeRegistryState();
    });
    childProcess.once('error', () => {
        runtimeRecord.status = 'stopped';
        runtimeRecord.isRunning = false;
        runtimeRecord.updatedAt = new Date().toISOString();
        void persistAgentProjectRuntimeRegistryState();
    });
    childProcess.unref();
}

/**
 * Applies installer-managed nginx and SSL configuration when a public domain exists.
 */
async function applyAgentProjectRuntimePublicConfiguration(
    domainAssignment: AgentProjectDomainAssignment,
): Promise<void> {
    if (!domainAssignment.record) {
        return;
    }

    try {
        await applyVpsRuntimeConfiguration({ isProcessRestartEnabled: false });
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to expose project \`${domainAssignment.record.projectName}\` on its public domain.

                **Project domain:** \`${domainAssignment.record.domain}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Resolves one existing project or throws a branded not-found error.
 */
async function resolveExistingAgentProject(options: AgentProjectRuntimeProjectOptions) {
    const project = await resolveAgentProjectInfo(options.agentPermanentId, options.projectName);

    if (!project) {
        throw new NotFoundError(
            spaceTrim(`
                Project \`${options.projectName}\` was not found for agent \`${options.agentPermanentId}\`.
            `),
        );
    }

    return project;
}

/**
 * Finds a runtime record by agent and project.
 */
function findAgentProjectRuntimeRecord(
    agentPermanentId: string,
    projectName: string,
): MutableAgentProjectRuntimeRecord | null {
    const normalizedAgentPermanentId = agentPermanentId.toLowerCase();
    const normalizedProjectName = projectName.toLowerCase();

    for (const runtimeRecord of getAgentProjectRuntimeRegistryState().runtimesById.values()) {
        if (
            runtimeRecord.agentPermanentId.toLowerCase() === normalizedAgentPermanentId &&
            runtimeRecord.projectName.toLowerCase() === normalizedProjectName
        ) {
            return runtimeRecord;
        }
    }

    return null;
}

/**
 * Refreshes one mutable runtime record from process and TCP state.
 */
async function refreshAgentProjectRuntimeRecord(runtimeRecord: MutableAgentProjectRuntimeRecord): Promise<void> {
    if (runtimeRecord.staticServer) {
        runtimeRecord.isRunning = runtimeRecord.staticServer.listening;
        runtimeRecord.status = runtimeRecord.staticServer.listening ? 'running' : 'stopped';
        runtimeRecord.updatedAt = new Date().toISOString();
        return;
    }

    const isListening = await isTcpPortListening(runtimeRecord.port, AGENT_PROJECT_RUNTIME_HOST);
    const pm2Status = await resolveAgentProjectRuntimePm2Status(runtimeRecord.pm2ProcessName);

    runtimeRecord.processId = pm2Status.processId ?? runtimeRecord.processId;
    runtimeRecord.isRunning = isListening;

    if (isListening) {
        runtimeRecord.status = 'running';
    } else if (runtimeRecord.mode === 'assigned-port') {
        runtimeRecord.status = 'assigned';
    } else if (pm2Status.isKnown && pm2Status.isRunning) {
        runtimeRecord.status = 'starting';
    } else if (runtimeRecord.childProcess && runtimeRecord.childProcess.exitCode === null) {
        runtimeRecord.status = 'starting';
    } else {
        runtimeRecord.status = 'stopped';
    }

    runtimeRecord.updatedAt = new Date().toISOString();
}

/**
 * Terminates one mutable runtime record.
 */
async function terminateAgentProjectRuntimeRecord(runtimeRecord: MutableAgentProjectRuntimeRecord): Promise<void> {
    if (runtimeRecord.staticServer?.listening) {
        await closeStaticServer(runtimeRecord.staticServer);
    }

    if (runtimeRecord.childProcess && runtimeRecord.childProcess.exitCode === null) {
        runtimeRecord.childProcess.kill();
    }

    await stopAgentProjectRuntimePm2Process(runtimeRecord.pm2ProcessName);
    await killProcessListeningOnPort(runtimeRecord.port);

    runtimeRecord.status = 'stopped';
    runtimeRecord.isRunning = false;
    runtimeRecord.updatedAt = new Date().toISOString();
}

/**
 * Starts listening with the static server.
 */
async function listenOnPort(staticServer: Server, port: number): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
        staticServer.once('error', reject);
        staticServer.listen(port, AGENT_PROJECT_RUNTIME_HOST, () => resolve());
    });
}

/**
 * Closes a static server.
 */
async function closeStaticServer(staticServer: Server): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
        staticServer.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

/**
 * Normalizes and parameterizes a dev command.
 */
function normalizeDevCommand(command: string | undefined, port: number): string {
    const normalizedCommand = (command || AGENT_PROJECT_RUNTIME_DEFAULT_DEV_COMMAND).trim();

    if (!normalizedCommand) {
        throw new NotAllowed(
            spaceTrim(`
                Missing project dev command.

                Pass a non-empty command or omit it to use \`${AGENT_PROJECT_RUNTIME_DEFAULT_DEV_COMMAND}\`.
            `),
        );
    }

    if (normalizedCommand.length > AGENT_PROJECT_RUNTIME_COMMAND_MAX_LENGTH) {
        throw new NotAllowed(
            spaceTrim(`
                Project dev command is too long.

                **Maximum length:** \`${AGENT_PROJECT_RUNTIME_COMMAND_MAX_LENGTH}\`
                **Received:** \`${normalizedCommand.length}\`
            `),
        );
    }

    return normalizedCommand
        .replaceAll(DEV_COMMAND_PORT_PLACEHOLDER, String(port))
        .replaceAll(DEV_COMMAND_HOST_PLACEHOLDER, AGENT_PROJECT_RUNTIME_HOST);
}

/**
 * Creates the local runtime URL for one port.
 */
function createAgentProjectRuntimeLocalUrl(port: number): string {
    return `http://${AGENT_PROJECT_RUNTIME_HOST}:${port}`;
}

/**
 * Creates a process-local runtime id.
 */
function createAgentProjectRuntimeId(): string {
    return randomUUID();
}

/**
 * Converts a mutable runtime record to a serializable runtime info object.
 */
function toAgentProjectRuntimeInfo(runtimeRecord: MutableAgentProjectRuntimeRecord): AgentProjectRuntimeInfo {
    return {
        id: runtimeRecord.id,
        agentPermanentId: runtimeRecord.agentPermanentId,
        projectName: runtimeRecord.projectName,
        projectPath: runtimeRecord.projectPath,
        mode: runtimeRecord.mode,
        port: runtimeRecord.port,
        url: runtimeRecord.url,
        localUrl: runtimeRecord.localUrl,
        publicUrl: runtimeRecord.publicUrl,
        domain: runtimeRecord.domain,
        projectHref: runtimeRecord.projectHref,
        command: runtimeRecord.command,
        processId: runtimeRecord.processId,
        pm2ProcessName: runtimeRecord.pm2ProcessName,
        status: runtimeRecord.status,
        isRunning: runtimeRecord.isRunning,
        startedAt: runtimeRecord.startedAt,
        updatedAt: runtimeRecord.updatedAt,
    };
}

/**
 * Converts a mutable runtime record to persisted JSON data.
 */
function toPersistedAgentProjectRuntimeRecord(
    runtimeRecord: MutableAgentProjectRuntimeRecord,
): PersistedAgentProjectRuntimeRecord {
    return {
        id: runtimeRecord.id,
        agentPermanentId: runtimeRecord.agentPermanentId,
        projectName: runtimeRecord.projectName,
        projectPath: runtimeRecord.projectPath,
        mode: runtimeRecord.mode,
        port: runtimeRecord.port,
        url: runtimeRecord.url,
        localUrl: runtimeRecord.localUrl,
        publicUrl: runtimeRecord.publicUrl,
        domain: runtimeRecord.domain,
        projectHref: runtimeRecord.projectHref,
        command: runtimeRecord.command,
        processId: runtimeRecord.processId,
        pm2ProcessName: runtimeRecord.pm2ProcessName,
        status: runtimeRecord.status,
        isRunning: runtimeRecord.isRunning,
        startedAt: runtimeRecord.startedAt,
        updatedAt: runtimeRecord.updatedAt,
    };
}

/**
 * Hydrates the in-memory registry from the persisted runtime registry once per process.
 */
async function hydrateAgentProjectRuntimeRegistryState(): Promise<void> {
    const registryState = getAgentProjectRuntimeRegistryState();

    if (registryState.isLoaded) {
        return;
    }

    const runtimeRecords = await readPersistedAgentProjectRuntimeRecords();
    registryState.runtimesById = new Map(
        runtimeRecords.map((runtimeRecord) => [runtimeRecord.id, { ...runtimeRecord }]),
    );
    registryState.isLoaded = true;
}

/**
 * Persists the in-memory runtime registry.
 */
async function persistAgentProjectRuntimeRegistryState(): Promise<void> {
    const registryState = getAgentProjectRuntimeRegistryState();
    const registryFilePath = resolveAgentProjectRuntimeRegistryFilePath();
    const payload: PersistedAgentProjectRuntimeRegistry = {
        version: AGENT_PROJECT_RUNTIME_REGISTRY_VERSION,
        runtimes: [...registryState.runtimesById.values()].map(toPersistedAgentProjectRuntimeRecord),
    };

    try {
        await mkdir(dirname(registryFilePath), { recursive: true });
        await writeFile(registryFilePath, `${JSON.stringify(payload, null, 4)}\n`, 'utf-8');
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to persist agent project runtime registry.

                **Registry file:** \`${registryFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Reads persisted project runtime records.
 */
async function readPersistedAgentProjectRuntimeRecords(): Promise<ReadonlyArray<PersistedAgentProjectRuntimeRecord>> {
    const registryFilePath = resolveAgentProjectRuntimeRegistryFilePath();
    let rawContent: string;

    try {
        rawContent = await readFile(registryFilePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }

        throw new UnexpectedError(
            spaceTrim(`
                Failed to read agent project runtime registry.

                **Registry file:** \`${registryFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }

    try {
        return parsePersistedAgentProjectRuntimeRegistry(JSON.parse(rawContent));
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to parse agent project runtime registry.

                **Registry file:** \`${registryFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Parses persisted runtime records and ignores invalid legacy rows.
 */
function parsePersistedAgentProjectRuntimeRegistry(
    rawValue: unknown,
): ReadonlyArray<PersistedAgentProjectRuntimeRecord> {
    if (!rawValue || typeof rawValue !== 'object') {
        return [];
    }

    const registry = rawValue as Partial<PersistedAgentProjectRuntimeRegistry>;

    if (!Array.isArray(registry.runtimes)) {
        return [];
    }

    return registry.runtimes
        .map((rawRecord): PersistedAgentProjectRuntimeRecord | null => {
            if (!rawRecord || typeof rawRecord !== 'object') {
                return null;
            }

            const record = rawRecord as Partial<PersistedAgentProjectRuntimeRecord>;

            if (
                typeof record.id !== 'string' ||
                typeof record.agentPermanentId !== 'string' ||
                typeof record.projectName !== 'string' ||
                typeof record.projectPath !== 'string' ||
                !isAgentProjectRuntimeMode(record.mode) ||
                typeof record.port !== 'number' ||
                typeof record.projectHref !== 'string' ||
                typeof record.startedAt !== 'string' ||
                typeof record.updatedAt !== 'string'
            ) {
                return null;
            }

            const localUrl =
                typeof record.localUrl === 'string' ? record.localUrl : createAgentProjectRuntimeLocalUrl(record.port);
            const publicUrl = typeof record.publicUrl === 'string' ? record.publicUrl : record.url || localUrl;

            return {
                id: record.id,
                agentPermanentId: record.agentPermanentId,
                projectName: record.projectName,
                projectPath: record.projectPath,
                mode: record.mode,
                port: record.port,
                url: typeof record.url === 'string' ? record.url : publicUrl,
                localUrl,
                publicUrl,
                domain: typeof record.domain === 'string' ? record.domain : null,
                projectHref: record.projectHref,
                command: typeof record.command === 'string' ? record.command : null,
                processId: typeof record.processId === 'number' ? record.processId : null,
                pm2ProcessName: typeof record.pm2ProcessName === 'string' ? record.pm2ProcessName : null,
                status: isAgentProjectRuntimeStatus(record.status) ? record.status : 'stopped',
                isRunning: record.isRunning === true,
                startedAt: record.startedAt,
                updatedAt: record.updatedAt,
            };
        })
        .filter((record): record is PersistedAgentProjectRuntimeRecord => record !== null);
}

/**
 * Checks whether a raw value is a known runtime status.
 */
function isAgentProjectRuntimeStatus(value: unknown): value is AgentProjectRuntimeStatus {
    return value === 'assigned' || value === 'starting' || value === 'running' || value === 'stopped';
}

/**
 * Checks whether a raw value is a known runtime mode.
 */
function isAgentProjectRuntimeMode(value: unknown): value is AgentProjectRuntimeMode {
    return value === 'assigned-port' || value === 'static-server' || value === 'dev-server';
}

/**
 * Returns the process-wide runtime registry.
 */
function getAgentProjectRuntimeRegistryState(): AgentProjectRuntimeRegistryState {
    const registryGlobal = globalThis as AgentProjectRuntimeRegistryGlobal;
    registryGlobal[AGENT_PROJECT_RUNTIME_REGISTRY_GLOBAL_KEY] ??= {
        runtimesById: new Map(),
        isLoaded: false,
    };

    return registryGlobal[AGENT_PROJECT_RUNTIME_REGISTRY_GLOBAL_KEY]!;
}
