import { spawn, type ChildProcess } from 'child_process';
import type { Server } from 'http';
import { randomUUID } from 'crypto';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
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
import { buildAgentProjectProfileHref } from './agentProjectHrefs';
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
    readonly runtimesById: Map<string, MutableAgentProjectRuntimeRecord>;
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
    projectHref: string;
    command: string | null;
    processId: number | null;
    status: AgentProjectRuntimeStatus;
    isRunning: boolean;
    startedAt: string;
    updatedAt: string;
    staticServer?: Server;
    childProcess?: ChildProcess;
};

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
    const existingRuntime = await resolveAgentProjectRuntime(options.agentPermanentId, options.projectName);

    if (existingRuntime) {
        return existingRuntime;
    }

    const project = await resolveExistingAgentProject(options);
    const port = await findFreeTcpPort();
    const now = new Date().toISOString();
    const runtimeRecord: MutableAgentProjectRuntimeRecord = {
        id: createAgentProjectRuntimeId(),
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        projectPath: project.absolutePath,
        mode: 'assigned-port',
        port,
        url: createAgentProjectRuntimeUrl(port),
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        command: null,
        processId: null,
        status: 'assigned',
        isRunning: false,
        startedAt: now,
        updatedAt: now,
    };

    getAgentProjectRuntimeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);
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
    const project = await resolveExistingAgentProject(options);

    await terminateAgentProjectRuntimeForProject(options);

    const port = await findFreeTcpPort();
    const staticServer = createStaticAgentProjectServer(project.absolutePath);

    await listenOnPort(staticServer, port);

    const now = new Date().toISOString();
    const runtimeRecord: MutableAgentProjectRuntimeRecord = {
        id: createAgentProjectRuntimeId(),
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        projectPath: project.absolutePath,
        mode: 'static-server',
        port,
        url: createAgentProjectRuntimeUrl(port),
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        command: null,
        processId: null,
        status: 'running',
        isRunning: true,
        startedAt: now,
        updatedAt: now,
        staticServer,
    };

    staticServer.once('close', () => {
        runtimeRecord.status = 'stopped';
        runtimeRecord.isRunning = false;
        runtimeRecord.updatedAt = new Date().toISOString();
    });

    getAgentProjectRuntimeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);
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
    const project = await resolveExistingAgentProject(options);

    await terminateAgentProjectRuntimeForProject(options);

    const port = await findFreeTcpPort();
    const command = normalizeDevCommand(options.command, port);
    const childProcess = spawn(command, {
        cwd: project.absolutePath,
        detached: false,
        env: {
            ...process.env,
            HOST: AGENT_PROJECT_RUNTIME_HOST,
            HOSTNAME: AGENT_PROJECT_RUNTIME_HOST,
            PORT: String(port),
        },
        shell: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    const now = new Date().toISOString();
    const runtimeRecord: MutableAgentProjectRuntimeRecord = {
        id: createAgentProjectRuntimeId(),
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        projectPath: project.absolutePath,
        mode: 'dev-server',
        port,
        url: createAgentProjectRuntimeUrl(port),
        projectHref: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        command,
        processId: childProcess.pid ?? null,
        status: 'starting',
        isRunning: false,
        startedAt: now,
        updatedAt: now,
        childProcess,
    };

    childProcess.once('exit', () => {
        runtimeRecord.status = 'stopped';
        runtimeRecord.isRunning = false;
        runtimeRecord.updatedAt = new Date().toISOString();
    });
    childProcess.once('error', () => {
        runtimeRecord.status = 'stopped';
        runtimeRecord.isRunning = false;
        runtimeRecord.updatedAt = new Date().toISOString();
    });
    childProcess.unref();

    getAgentProjectRuntimeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);

    const isListening = await waitForTcpPortListening({
        port,
        host: AGENT_PROJECT_RUNTIME_HOST,
        timeoutMs: AGENT_PROJECT_RUNTIME_START_TIMEOUT_MS,
        pollIntervalMs: AGENT_PROJECT_RUNTIME_START_POLL_INTERVAL_MS,
    });

    if (isListening) {
        runtimeRecord.status = 'running';
        runtimeRecord.isRunning = true;
        runtimeRecord.updatedAt = new Date().toISOString();
    }

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
    const runtimeRecord = findAgentProjectRuntimeRecord(agentPermanentId, projectName);

    if (!runtimeRecord) {
        return null;
    }

    await refreshAgentProjectRuntimeRecord(runtimeRecord);
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Lists all assigned project runtimes.
 *
 * @returns Runtime infos ordered by start time.
 */
export async function listAgentProjectRuntimes(): Promise<ReadonlyArray<AgentProjectRuntimeInfo>> {
    const runtimeRecords = [...getAgentProjectRuntimeRegistryState().runtimesById.values()];

    await Promise.all(runtimeRecords.map((runtimeRecord) => refreshAgentProjectRuntimeRecord(runtimeRecord)));

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
    const runtimeRecord = getAgentProjectRuntimeRegistryState().runtimesById.get(runtimeId);

    if (!runtimeRecord) {
        return null;
    }

    await terminateAgentProjectRuntimeRecord(runtimeRecord);
    getAgentProjectRuntimeRegistryState().runtimesById.delete(runtimeId);
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
    const runtimeRecord = findAgentProjectRuntimeRecord(options.agentPermanentId, options.projectName);

    if (!runtimeRecord) {
        return null;
    }

    await terminateAgentProjectRuntimeRecord(runtimeRecord);
    getAgentProjectRuntimeRegistryState().runtimesById.delete(runtimeRecord.id);
    return toAgentProjectRuntimeInfo(runtimeRecord);
}

/**
 * Terminates all project runtimes in the current process.
 *
 * This is used by tests and process-level cleanup.
 */
export async function terminateAllAgentProjectRuntimes(): Promise<void> {
    const runtimeIds = [...getAgentProjectRuntimeRegistryState().runtimesById.keys()];

    await Promise.all(runtimeIds.map((runtimeId) => terminateAgentProjectRuntimeById(runtimeId)));
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
    runtimeRecord.isRunning = isListening;

    if (isListening) {
        runtimeRecord.status = 'running';
    } else if (runtimeRecord.childProcess && runtimeRecord.childProcess.exitCode === null) {
        runtimeRecord.status = 'starting';
    } else if (runtimeRecord.mode === 'assigned-port') {
        runtimeRecord.status = 'assigned';
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
function createAgentProjectRuntimeUrl(port: number): string {
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
        projectHref: runtimeRecord.projectHref,
        command: runtimeRecord.command,
        processId: runtimeRecord.processId,
        status: runtimeRecord.status,
        isRunning: runtimeRecord.isRunning,
        startedAt: runtimeRecord.startedAt,
        updatedAt: runtimeRecord.updatedAt,
    };
}

/**
 * Returns the process-wide runtime registry.
 */
function getAgentProjectRuntimeRegistryState(): AgentProjectRuntimeRegistryState {
    const registryGlobal = globalThis as AgentProjectRuntimeRegistryGlobal;
    registryGlobal[AGENT_PROJECT_RUNTIME_REGISTRY_GLOBAL_KEY] ??= {
        runtimesById: new Map(),
    };

    return registryGlobal[AGENT_PROJECT_RUNTIME_REGISTRY_GLOBAL_KEY]!;
}

