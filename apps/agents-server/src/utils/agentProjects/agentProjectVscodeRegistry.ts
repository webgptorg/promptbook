import { spawn, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { EnvironmentMismatchError } from '../../../../../src/errors/EnvironmentMismatchError';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { resolvePromptbookTemporaryPath } from '../../../../../src/utils/filesystem/promptbookTemporaryPath';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import type {
    AgentProjectVscodeRuntimeInfo,
    AgentProjectVscodeRuntimeStatus,
    AgentProjectVscodeTheme,
} from './AgentProjectVscodeRuntimeInfo';
import {
    AGENT_PROJECT_VSCODE_DEFAULT_COMMAND,
    AGENT_PROJECT_VSCODE_HOST,
    AGENT_PROJECT_VSCODE_IDLE_TIMEOUT_SECONDS,
    AGENT_PROJECT_VSCODE_START_POLL_INTERVAL_MS,
    AGENT_PROJECT_VSCODE_START_TIMEOUT_MS,
    PTBK_AGENT_PROJECT_VSCODE_COMMAND_ENV,
} from './agentProjectVscodeConstants';
import { buildAgentProjectVscodeProxyPath } from './agentProjectVscodeHrefs';
import { findFreeTcpPort } from './findFreeTcpPort';
import { isTcpPortListening, waitForTcpPortListening } from './isTcpPortListening';
import { resolveAgentProjectInfo } from './resolveAgentProjectInfo';

/**
 * Global key used to keep browser VS Code runtimes alive across module reloads.
 */
const AGENT_PROJECT_VSCODE_REGISTRY_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_VSCODE_REGISTRY__';

/**
 * Directory name used for code-server user data.
 */
const AGENT_PROJECT_VSCODE_USER_DATA_DIRECTORY_NAME = 'user-data';

/**
 * Directory name used for code-server extensions.
 */
const AGENT_PROJECT_VSCODE_EXTENSIONS_DIRECTORY_NAME = 'extensions';

/**
 * Relative path to the code-server user settings file.
 */
const AGENT_PROJECT_VSCODE_USER_SETTINGS_PATH = ['User', 'settings.json'] as const;

/**
 * Pattern of characters replaced when building VS Code runtime storage directory names.
 */
const AGENT_PROJECT_VSCODE_STORAGE_UNSAFE_CHARACTER_PATTERN = /[^a-zA-Z0-9._-]/g;

/**
 * Project runtime registry stored on `globalThis`.
 */
type AgentProjectVscodeRegistryState = {
    /**
     * Runtime records keyed by runtime id.
     */
    readonly runtimesById: Map<string, MutableAgentProjectVscodeRuntimeRecord>;
};

/**
 * Global object shape used for process-wide browser VS Code state.
 */
type AgentProjectVscodeRegistryGlobal = typeof globalThis & {
    [AGENT_PROJECT_VSCODE_REGISTRY_GLOBAL_KEY]?: AgentProjectVscodeRegistryState;
};

/**
 * Mutable internal browser VS Code runtime record.
 */
type MutableAgentProjectVscodeRuntimeRecord = {
    id: string;
    agentPermanentId: string;
    projectName: string;
    projectPath: string;
    port: number;
    localUrl: string;
    proxyPath: string;
    processId: number | null;
    status: AgentProjectVscodeRuntimeStatus;
    isRunning: boolean;
    startedAt: string;
    updatedAt: string;
    childProcess: ChildProcess;
};

/**
 * Options identifying one agent project browser VS Code runtime.
 */
export type AgentProjectVscodeRuntimeProjectOptions = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Theme applied to code-server settings before opening the project.
     */
    readonly theme: AgentProjectVscodeTheme;
};

/**
 * Starts or reconnects to browser VS Code for one agent project.
 *
 * @param options - Agent, project, and theme identification.
 * @returns Runtime info for the browser VS Code process.
 */
export async function startAgentProjectVscodeRuntime(
    options: AgentProjectVscodeRuntimeProjectOptions,
): Promise<AgentProjectVscodeRuntimeInfo> {
    const existingRuntime = findAgentProjectVscodeRuntimeRecord(options.agentPermanentId, options.projectName);
    if (existingRuntime) {
        await refreshAgentProjectVscodeRuntimeRecord(existingRuntime);

        if (existingRuntime.isRunning) {
            await writeAgentProjectVscodeSettings({
                agentPermanentId: options.agentPermanentId,
                projectName: existingRuntime.projectName,
                theme: options.theme,
            });
            return toAgentProjectVscodeRuntimeInfo(existingRuntime);
        }

        getAgentProjectVscodeRegistryState().runtimesById.delete(existingRuntime.id);
    }

    const project = await resolveExistingAgentProject(options);
    await writeAgentProjectVscodeSettings({
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        theme: options.theme,
    });

    const port = await findFreeTcpPort(AGENT_PROJECT_VSCODE_HOST);
    const command = resolveAgentProjectVscodeCommand();
    const storage = resolveAgentProjectVscodeStorage(options.agentPermanentId, project.projectName);
    await Promise.all([
        mkdir(storage.userDataDirectory, { recursive: true }),
        mkdir(storage.extensionsDirectory, { recursive: true }),
    ]);

    const childProcess = spawn(
        command,
        createAgentProjectVscodeArguments({ port, projectPath: project.absolutePath, storage }),
        {
            cwd: project.absolutePath,
            detached: false,
            env: {
                ...process.env,
                CS_DISABLE_GETTING_STARTED_OVERRIDE: 'true',
                CS_DISABLE_PROXY: 'true',
            },
            shell: process.platform === 'win32',
            stdio: 'ignore',
            windowsHide: true,
        },
    );
    const now = new Date().toISOString();
    const runtimeRecord: MutableAgentProjectVscodeRuntimeRecord = {
        id: createAgentProjectVscodeRuntimeId(),
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        projectPath: project.absolutePath,
        port,
        localUrl: createAgentProjectVscodeLocalUrl(port),
        proxyPath: '',
        processId: childProcess.pid ?? null,
        status: 'starting',
        isRunning: false,
        startedAt: now,
        updatedAt: now,
        childProcess,
    };
    runtimeRecord.proxyPath = buildAgentProjectVscodeProxyPath(runtimeRecord.id);

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

    getAgentProjectVscodeRegistryState().runtimesById.set(runtimeRecord.id, runtimeRecord);

    const isListening = await waitForTcpPortListening({
        port,
        host: AGENT_PROJECT_VSCODE_HOST,
        timeoutMs: AGENT_PROJECT_VSCODE_START_TIMEOUT_MS,
        pollIntervalMs: AGENT_PROJECT_VSCODE_START_POLL_INTERVAL_MS,
    });

    if (!isListening) {
        getAgentProjectVscodeRegistryState().runtimesById.delete(runtimeRecord.id);
        childProcess.kill();
        throw createAgentProjectVscodeUnavailableError(command, project.projectName);
    }

    runtimeRecord.status = 'running';
    runtimeRecord.isRunning = true;
    runtimeRecord.updatedAt = new Date().toISOString();

    return toAgentProjectVscodeRuntimeInfo(runtimeRecord);
}

/**
 * Resolves one browser VS Code runtime by id.
 *
 * @param runtimeId - Process-local browser VS Code runtime id.
 * @returns Runtime info or `null`.
 */
export async function resolveAgentProjectVscodeRuntimeById(
    runtimeId: string,
): Promise<AgentProjectVscodeRuntimeInfo | null> {
    const runtimeRecord = getAgentProjectVscodeRegistryState().runtimesById.get(runtimeId);

    if (!runtimeRecord) {
        return null;
    }

    await refreshAgentProjectVscodeRuntimeRecord(runtimeRecord);
    return toAgentProjectVscodeRuntimeInfo(runtimeRecord);
}

/**
 * Resolves one existing project or throws a branded not-found error.
 */
async function resolveExistingAgentProject(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
}) {
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
 * Finds a browser VS Code runtime record by agent and project.
 */
function findAgentProjectVscodeRuntimeRecord(
    agentPermanentId: string,
    projectName: string,
): MutableAgentProjectVscodeRuntimeRecord | null {
    const normalizedAgentPermanentId = agentPermanentId.toLowerCase();
    const normalizedProjectName = projectName.toLowerCase();

    for (const runtimeRecord of getAgentProjectVscodeRegistryState().runtimesById.values()) {
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
 * Refreshes one mutable browser VS Code runtime record from TCP state.
 */
async function refreshAgentProjectVscodeRuntimeRecord(
    runtimeRecord: MutableAgentProjectVscodeRuntimeRecord,
): Promise<void> {
    const isListening = await isTcpPortListening(runtimeRecord.port, AGENT_PROJECT_VSCODE_HOST);
    runtimeRecord.isRunning = isListening;
    if (isListening) {
        runtimeRecord.status = 'running';
    } else if (runtimeRecord.childProcess.exitCode === null) {
        runtimeRecord.status = 'starting';
    } else {
        runtimeRecord.status = 'stopped';
    }
    runtimeRecord.updatedAt = new Date().toISOString();
}

/**
 * Returns the executable used to start code-server.
 */
function resolveAgentProjectVscodeCommand(): string {
    return process.env[PTBK_AGENT_PROJECT_VSCODE_COMMAND_ENV]?.trim() || AGENT_PROJECT_VSCODE_DEFAULT_COMMAND;
}

/**
 * Builds code-server CLI arguments for one project runtime.
 */
function createAgentProjectVscodeArguments(options: {
    readonly port: number;
    readonly projectPath: string;
    readonly storage: AgentProjectVscodeStorage;
}): ReadonlyArray<string> {
    return [
        '--bind-addr',
        `${AGENT_PROJECT_VSCODE_HOST}:${options.port}`,
        '--auth',
        'none',
        '--disable-telemetry',
        '--disable-getting-started-override',
        '--disable-proxy',
        '--idle-timeout-seconds',
        String(AGENT_PROJECT_VSCODE_IDLE_TIMEOUT_SECONDS),
        '--user-data-dir',
        options.storage.userDataDirectory,
        '--extensions-dir',
        options.storage.extensionsDirectory,
        options.projectPath,
    ];
}

/**
 * Storage paths used by one browser VS Code runtime.
 */
type AgentProjectVscodeStorage = {
    readonly userDataDirectory: string;
    readonly extensionsDirectory: string;
};

/**
 * Resolves filesystem storage paths for one browser VS Code runtime.
 */
function resolveAgentProjectVscodeStorage(agentPermanentId: string, projectName: string): AgentProjectVscodeStorage {
    const rootDirectory = join(
        resolvePromptbookTemporaryPath(process.cwd(), 'agents-server', 'vscode'),
        createAgentProjectVscodeStorageSegment(`agent-${agentPermanentId}`),
        createAgentProjectVscodeStorageSegment(projectName),
    );

    return {
        userDataDirectory: join(rootDirectory, AGENT_PROJECT_VSCODE_USER_DATA_DIRECTORY_NAME),
        extensionsDirectory: join(rootDirectory, AGENT_PROJECT_VSCODE_EXTENSIONS_DIRECTORY_NAME),
    };
}

/**
 * Writes code-server user settings for theme and project ergonomics.
 */
async function writeAgentProjectVscodeSettings(options: AgentProjectVscodeRuntimeProjectOptions): Promise<void> {
    const storage = resolveAgentProjectVscodeStorage(options.agentPermanentId, options.projectName);
    const settingsPath = join(storage.userDataDirectory, ...AGENT_PROJECT_VSCODE_USER_SETTINGS_PATH);
    const existingSettings = await readJsonObjectFile(settingsPath);

    await mkdir(join(storage.userDataDirectory, AGENT_PROJECT_VSCODE_USER_SETTINGS_PATH[0]), { recursive: true });
    await writeFile(
        settingsPath,
        `${JSON.stringify(
            {
                ...existingSettings,
                'security.workspace.trust.enabled': false,
                'telemetry.telemetryLevel': 'off',
                'workbench.colorTheme': resolveAgentProjectVscodeColorTheme(options.theme),
                'workbench.preferredDarkColorTheme': resolveAgentProjectVscodeColorTheme('DARK'),
                'workbench.preferredLightColorTheme': resolveAgentProjectVscodeColorTheme('LIGHT'),
                'workbench.startupEditor': 'none',
            },
            null,
            4,
        )}\n`,
        'utf-8',
    );
}

/**
 * Reads a JSON object file, returning an empty object when the file is missing or invalid.
 */
async function readJsonObjectFile(filePath: string): Promise<Record<string, unknown>> {
    try {
        const parsedValue = JSON.parse(await readFile(filePath, 'utf-8')) as unknown;
        return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
            ? (parsedValue as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}

/**
 * Maps an Agents Server theme to a built-in VS Code color theme.
 */
function resolveAgentProjectVscodeColorTheme(theme: AgentProjectVscodeTheme): string {
    return theme === 'DARK' ? 'Default Dark Modern' : 'Default Light Modern';
}

/**
 * Converts one raw segment into a filesystem-safe storage directory segment.
 */
function createAgentProjectVscodeStorageSegment(segment: string): string {
    return (
        segment
            .trim()
            .replace(AGENT_PROJECT_VSCODE_STORAGE_UNSAFE_CHARACTER_PATTERN, '-')
            .replace(/^[._-]+|[._-]+$/gu, '') || 'project'
    );
}

/**
 * Creates the local code-server URL for one port.
 */
function createAgentProjectVscodeLocalUrl(port: number): string {
    return `http://${AGENT_PROJECT_VSCODE_HOST}:${port}`;
}

/**
 * Creates a process-local browser VS Code runtime id.
 */
function createAgentProjectVscodeRuntimeId(): string {
    return randomUUID();
}

/**
 * Creates a branded unavailable-runtime error.
 */
function createAgentProjectVscodeUnavailableError(command: string, projectName: string): EnvironmentMismatchError {
    return new EnvironmentMismatchError(
        spaceTrim(`
            Cannot start browser VS Code for project \`${projectName}\`.

            The \`${command}\` command did not start a listening code-server process in time.

            **Install code-server on the server** or set \`${PTBK_AGENT_PROJECT_VSCODE_COMMAND_ENV}\` to the
            code-server executable path.
        `),
    );
}

/**
 * Converts a mutable runtime record to a serializable runtime info object.
 */
function toAgentProjectVscodeRuntimeInfo(
    runtimeRecord: MutableAgentProjectVscodeRuntimeRecord,
): AgentProjectVscodeRuntimeInfo {
    return {
        id: runtimeRecord.id,
        agentPermanentId: runtimeRecord.agentPermanentId,
        projectName: runtimeRecord.projectName,
        projectPath: runtimeRecord.projectPath,
        port: runtimeRecord.port,
        localUrl: runtimeRecord.localUrl,
        proxyPath: runtimeRecord.proxyPath,
        processId: runtimeRecord.processId,
        status: runtimeRecord.status,
        isRunning: runtimeRecord.isRunning,
        startedAt: runtimeRecord.startedAt,
        updatedAt: runtimeRecord.updatedAt,
    };
}

/**
 * Returns the process-wide browser VS Code runtime registry.
 */
function getAgentProjectVscodeRegistryState(): AgentProjectVscodeRegistryState {
    const registryGlobal = globalThis as AgentProjectVscodeRegistryGlobal;
    registryGlobal[AGENT_PROJECT_VSCODE_REGISTRY_GLOBAL_KEY] ??= {
        runtimesById: new Map(),
    };

    return registryGlobal[AGENT_PROJECT_VSCODE_REGISTRY_GLOBAL_KEY]!;
}
