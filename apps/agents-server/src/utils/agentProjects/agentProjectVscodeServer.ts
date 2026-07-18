import { spawn, type ChildProcess } from 'child_process';
import { randomBytes, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { EnvironmentMismatchError } from '../../../../../src/errors/EnvironmentMismatchError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import type { ResolvedThemeMode } from '../../constants/themeMode';
import { resolveAgentFolderPath } from './agentProjectsPaths';
import { AGENT_PROJECT_RUNTIME_HOST } from './agentProjectRuntimeConstants';
import { buildAgentProjectVscodeProxyBasePath } from './agentProjectVscodeProxy';
import { findFreeTcpPort } from './findFreeTcpPort';
import { isTcpPortListening, waitForTcpPortListening } from './isTcpPortListening';

/**
 * Global key used to keep browser VS Code sessions alive across module reloads.
 */
const AGENT_PROJECT_VSCODE_STATE_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_VSCODE_STATE__';

/**
 * Default code-server npm package launched through `npx` when no explicit command is configured.
 */
const CODE_SERVER_NPX_PACKAGE = 'code-server@4.117.0';

/**
 * Environment variable overriding the command used to start browser VS Code.
 */
const CODE_SERVER_COMMAND_ENV = 'PTBK_AGENT_PROJECT_VSCODE_COMMAND';

/**
 * Environment variable with a JSON string-array or whitespace-separated arguments prepended before code-server flags.
 */
const CODE_SERVER_COMMAND_ARGUMENTS_ENV = 'PTBK_AGENT_PROJECT_VSCODE_ARGUMENTS';

/**
 * Directory name used for browser VS Code state inside an agent folder.
 */
const AGENT_PROJECT_VSCODE_DIRECTORY_NAME = 'vscode';

/**
 * Directory name used for VS Code user-data folders.
 */
const CODE_SERVER_USER_DATA_DIRECTORY_NAME = 'user-data';

/**
 * Directory name used for VS Code extension folders.
 */
const CODE_SERVER_EXTENSIONS_DIRECTORY_NAME = 'extensions';

/**
 * Browser VS Code session retention after the child process exits.
 */
const AGENT_PROJECT_VSCODE_SESSION_RETENTION_MILLISECONDS = 6 * 2 * 60 * 60 * 1000;

/**
 * Maximum buffered startup output kept for diagnostics.
 */
const CODE_SERVER_OUTPUT_MAX_LENGTH = 10 * 1000;

/**
 * Random byte count used for per-session browser VS Code access tokens.
 */
const AGENT_PROJECT_VSCODE_ACCESS_TOKEN_BYTE_LENGTH = 16 * 2;

/**
 * Time spent waiting for code-server to bind its local port.
 */
const CODE_SERVER_START_TIMEOUT_MILLISECONDS = 6 * 20 * 1000;

/**
 * Polling interval while waiting for code-server to start.
 */
const CODE_SERVER_START_POLL_INTERVAL_MILLISECONDS = 500;

/**
 * VS Code theme used when the Agents Server is in dark mode.
 */
const CODE_SERVER_DARK_THEME_NAME = 'Default Dark Modern';

/**
 * VS Code theme used when the Agents Server is in light mode.
 */
const CODE_SERVER_LIGHT_THEME_NAME = 'Default Light Modern';

/**
 * Settings filename under code-server's user-data directory.
 */
const CODE_SERVER_SETTINGS_FILE_NAME = 'settings.json';

/**
 * VS Code settings directory name under code-server's user-data directory.
 */
const CODE_SERVER_SETTINGS_DIRECTORY_NAME = 'User';

/**
 * Options for starting one project browser VS Code session.
 */
export type StartAgentProjectVscodeSessionOptions = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Absolute project directory path.
     */
    readonly projectPath: string;

    /**
     * Resolved Agents Server theme mode for the browser user opening VS Code.
     */
    readonly resolvedThemeMode: ResolvedThemeMode;
};

/**
 * Serializable browser VS Code session metadata used by the launcher route and proxy.
 */
export type AgentProjectVscodeSessionInfo = {
    /**
     * Opaque session id used in the same-origin proxy path.
     */
    readonly id: string;

    /**
     * Stable key identifying this agent/project/theme session.
     */
    readonly sessionKey: string;

    /**
     * Random per-session access token stored in an HTTP-only cookie.
     */
    readonly accessToken: string;

    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Absolute project directory path.
     */
    readonly projectPath: string;

    /**
     * Resolved theme used by this browser VS Code process.
     */
    readonly resolvedThemeMode: ResolvedThemeMode;

    /**
     * Local code-server port.
     */
    readonly port: number;

    /**
     * Same-origin proxy base path.
     */
    readonly proxyBasePath: string;

    /**
     * Child process id when available.
     */
    readonly processId: number | null;

    /**
     * Whether the code-server process is still expected to be available.
     */
    readonly isRunning: boolean;

    /**
     * ISO timestamp when this session started.
     */
    readonly startedAt: string;

    /**
     * ISO timestamp of the latest status update.
     */
    readonly updatedAt: string;
};

/**
 * Mutable process-local browser VS Code session.
 */
type MutableAgentProjectVscodeSession = {
    -readonly [Key in keyof AgentProjectVscodeSessionInfo]: AgentProjectVscodeSessionInfo[Key];
} & {
    childProcess: ChildProcess;
    cleanupTimeout: NodeJS.Timeout | null;
    output: string;
};

/**
 * Browser VS Code registry stored on `globalThis`.
 */
type AgentProjectVscodeState = {
    readonly sessionsById: Map<string, MutableAgentProjectVscodeSession>;
    readonly latestSessionIdByKey: Map<string, string>;
};

/**
 * Global object shape used for browser VS Code session state.
 */
type AgentProjectVscodeGlobal = typeof globalThis & {
    [AGENT_PROJECT_VSCODE_STATE_GLOBAL_KEY]?: AgentProjectVscodeState;
};

/**
 * Starts or reconnects to one project browser VS Code session.
 *
 * @param options - Agent, project, path, and theme.
 * @returns Running browser VS Code session.
 */
export async function startAgentProjectVscodeSession(
    options: StartAgentProjectVscodeSessionOptions,
): Promise<AgentProjectVscodeSessionInfo> {
    if (process.platform === 'win32') {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Browser VS Code for agent projects is not available on Windows servers.

                The feature starts \`code-server\`, which requires native VS Code server dependencies that are
                expected to be available on the Linux/macOS server runtime.
            `),
        );
    }

    const sessionKey = createAgentProjectVscodeSessionKey(options);
    const existingSession = await refreshLatestAgentProjectVscodeSession(sessionKey);
    if (existingSession?.isRunning) {
        return toAgentProjectVscodeSessionInfo(existingSession);
    }

    const port = await findFreeTcpPort();
    const sessionId = randomUUID();
    const accessToken = randomBytes(AGENT_PROJECT_VSCODE_ACCESS_TOKEN_BYTE_LENGTH).toString('hex');
    const proxyBasePath = buildAgentProjectVscodeProxyBasePath(sessionId);
    const dataDirectories = resolveAgentProjectVscodeDataDirectories({
        agentPermanentId: options.agentPermanentId,
        projectName: options.projectName,
        resolvedThemeMode: options.resolvedThemeMode,
    });

    await writeCodeServerUserSettings({
        userDataDirectoryPath: dataDirectories.userDataDirectoryPath,
        projectPath: options.projectPath,
        resolvedThemeMode: options.resolvedThemeMode,
    });

    const codeServerCommand = resolveCodeServerCommand();
    const codeServerArguments = [
        ...codeServerCommand.initialArguments,
        '--auth',
        'none',
        '--bind-addr',
        `${AGENT_PROJECT_RUNTIME_HOST}:${port}`,
        '--disable-telemetry',
        '--disable-update-check',
        '--disable-getting-started-override',
        '--disable-proxy',
        '--user-data-dir',
        dataDirectories.userDataDirectoryPath,
        '--extensions-dir',
        dataDirectories.extensionsDirectoryPath,
        options.projectPath,
    ];
    const childProcess = spawn(codeServerCommand.command, codeServerArguments, {
        cwd: options.projectPath,
        env: {
            ...process.env,
            CS_DISABLE_PROXY: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
    });
    const now = new Date().toISOString();
    const mutableSession: MutableAgentProjectVscodeSession = {
        id: sessionId,
        sessionKey,
        accessToken,
        agentPermanentId: options.agentPermanentId,
        projectName: options.projectName,
        projectPath: options.projectPath,
        resolvedThemeMode: options.resolvedThemeMode,
        port,
        proxyBasePath,
        processId: childProcess.pid ?? null,
        isRunning: true,
        startedAt: now,
        updatedAt: now,
        childProcess,
        cleanupTimeout: null,
        output: '',
    };

    bindCodeServerProcessEvents(mutableSession);
    getAgentProjectVscodeState().sessionsById.set(sessionId, mutableSession);
    getAgentProjectVscodeState().latestSessionIdByKey.set(sessionKey, sessionId);

    const isCodeServerReady = await waitForTcpPortListening({
        port,
        host: AGENT_PROJECT_RUNTIME_HOST,
        timeoutMs: CODE_SERVER_START_TIMEOUT_MILLISECONDS,
        pollIntervalMs: CODE_SERVER_START_POLL_INTERVAL_MILLISECONDS,
    });

    if (!isCodeServerReady) {
        childProcess.kill('SIGTERM');
        mutableSession.isRunning = false;
        mutableSession.updatedAt = new Date().toISOString();

        throw new EnvironmentMismatchError(
            spaceTrim(`
                Failed to start browser VS Code for project \`${options.projectName}\`.

                The \`code-server\` process did not start listening on \`${AGENT_PROJECT_RUNTIME_HOST}:${port}\`
                within the startup timeout.

                **Command:** \`${codeServerCommand.command} ${codeServerArguments.join(' ')}\`
                **Output:**
                \`\`\`
                ${mutableSession.output || 'No output captured.'}
                \`\`\`
            `),
        );
    }

    return toAgentProjectVscodeSessionInfo(mutableSession);
}

/**
 * Looks up one browser VS Code session by id.
 *
 * @param sessionId - Opaque session id.
 * @returns Running or retained session, or `null`.
 */
export function getAgentProjectVscodeSession(sessionId: string): AgentProjectVscodeSessionInfo | null {
    const session = getAgentProjectVscodeState().sessionsById.get(sessionId);
    return session ? toAgentProjectVscodeSessionInfo(session) : null;
}

/**
 * Refreshes one browser VS Code session from process and TCP state.
 *
 * @param sessionId - Opaque session id.
 * @returns Refreshed session or `null`.
 */
export async function refreshAgentProjectVscodeSession(
    sessionId: string,
): Promise<AgentProjectVscodeSessionInfo | null> {
    const session = getAgentProjectVscodeState().sessionsById.get(sessionId);
    if (!session) {
        return null;
    }

    await refreshMutableAgentProjectVscodeSession(session);
    return toAgentProjectVscodeSessionInfo(session);
}

/**
 * Stops one browser VS Code session and removes it from the registry.
 *
 * @param sessionId - Opaque session id.
 * @returns Stopped session or `null`.
 */
export async function stopAgentProjectVscodeSession(sessionId: string): Promise<AgentProjectVscodeSessionInfo | null> {
    const session = getAgentProjectVscodeState().sessionsById.get(sessionId);
    if (!session) {
        return null;
    }

    if (session.isRunning) {
        session.childProcess.kill('SIGTERM');
    }

    session.isRunning = false;
    session.updatedAt = new Date().toISOString();
    getAgentProjectVscodeState().sessionsById.delete(sessionId);
    if (getAgentProjectVscodeState().latestSessionIdByKey.get(session.sessionKey) === sessionId) {
        getAgentProjectVscodeState().latestSessionIdByKey.delete(session.sessionKey);
    }

    return toAgentProjectVscodeSessionInfo(session);
}

/**
 * Returns the mutable process-wide browser VS Code registry.
 *
 * @returns Browser VS Code registry.
 */
function getAgentProjectVscodeState(): AgentProjectVscodeState {
    const vscodeGlobal = globalThis as AgentProjectVscodeGlobal;
    vscodeGlobal[AGENT_PROJECT_VSCODE_STATE_GLOBAL_KEY] ??= {
        sessionsById: new Map(),
        latestSessionIdByKey: new Map(),
    };

    return vscodeGlobal[AGENT_PROJECT_VSCODE_STATE_GLOBAL_KEY]!;
}

/**
 * Refreshes the latest session for one key.
 *
 * @param sessionKey - Stable project/theme session key.
 * @returns Mutable session or `null`.
 */
async function refreshLatestAgentProjectVscodeSession(
    sessionKey: string,
): Promise<MutableAgentProjectVscodeSession | null> {
    const sessionId = getAgentProjectVscodeState().latestSessionIdByKey.get(sessionKey);
    if (!sessionId) {
        return null;
    }

    const session = getAgentProjectVscodeState().sessionsById.get(sessionId);
    if (!session) {
        getAgentProjectVscodeState().latestSessionIdByKey.delete(sessionKey);
        return null;
    }

    await refreshMutableAgentProjectVscodeSession(session);
    return session;
}

/**
 * Refreshes one mutable session against the child-process and TCP state.
 *
 * @param session - Mutable browser VS Code session.
 */
async function refreshMutableAgentProjectVscodeSession(session: MutableAgentProjectVscodeSession): Promise<void> {
    const isListening = await isTcpPortListening(session.port, AGENT_PROJECT_RUNTIME_HOST);
    const isProcessAlive = session.childProcess.exitCode === null && session.childProcess.signalCode === null;

    session.isRunning = isProcessAlive && isListening;
    session.updatedAt = new Date().toISOString();
}

/**
 * Binds output and exit bookkeeping to one code-server child process.
 *
 * @param session - Mutable browser VS Code session.
 */
function bindCodeServerProcessEvents(session: MutableAgentProjectVscodeSession): void {
    session.childProcess.stdout?.setEncoding('utf-8');
    session.childProcess.stderr?.setEncoding('utf-8');
    session.childProcess.stdout?.on('data', (chunk: string) => appendCodeServerOutput(session, chunk));
    session.childProcess.stderr?.on('data', (chunk: string) => appendCodeServerOutput(session, chunk));
    session.childProcess.once('error', (error) => appendCodeServerOutput(session, `${error.message}\n`));
    session.childProcess.once('exit', () => {
        session.isRunning = false;
        session.updatedAt = new Date().toISOString();
        scheduleAgentProjectVscodeSessionCleanup(session);
    });
}

/**
 * Appends bounded code-server diagnostics.
 *
 * @param session - Mutable browser VS Code session.
 * @param chunk - Output chunk.
 */
function appendCodeServerOutput(session: MutableAgentProjectVscodeSession, chunk: string): void {
    session.output = (session.output + chunk).slice(-CODE_SERVER_OUTPUT_MAX_LENGTH);
}

/**
 * Schedules cleanup for a stopped browser VS Code session.
 *
 * @param session - Mutable browser VS Code session.
 */
function scheduleAgentProjectVscodeSessionCleanup(session: MutableAgentProjectVscodeSession): void {
    if (session.cleanupTimeout) {
        clearTimeout(session.cleanupTimeout);
    }

    session.cleanupTimeout = setTimeout(() => {
        const state = getAgentProjectVscodeState();
        state.sessionsById.delete(session.id);
        if (state.latestSessionIdByKey.get(session.sessionKey) === session.id) {
            state.latestSessionIdByKey.delete(session.sessionKey);
        }
    }, AGENT_PROJECT_VSCODE_SESSION_RETENTION_MILLISECONDS);
}

/**
 * Creates a stable project/theme session key.
 *
 * @param options - Project and theme identity.
 * @returns Stable session key.
 */
function createAgentProjectVscodeSessionKey(options: StartAgentProjectVscodeSessionOptions): string {
    return JSON.stringify([
        options.agentPermanentId.toLowerCase(),
        options.projectName.toLowerCase(),
        options.resolvedThemeMode,
    ]);
}

/**
 * Resolves browser VS Code data directories for one project/theme.
 *
 * @param options - Project and theme identity.
 * @returns User-data and extensions directories.
 */
function resolveAgentProjectVscodeDataDirectories(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly resolvedThemeMode: ResolvedThemeMode;
}): {
    readonly userDataDirectoryPath: string;
    readonly extensionsDirectoryPath: string;
} {
    const projectVscodeRootPath = join(
        resolveAgentFolderPath(options.agentPermanentId),
        AGENT_PROJECT_VSCODE_DIRECTORY_NAME,
        options.projectName,
        options.resolvedThemeMode.toLowerCase(),
    );

    return {
        userDataDirectoryPath: join(projectVscodeRootPath, CODE_SERVER_USER_DATA_DIRECTORY_NAME),
        extensionsDirectoryPath: join(projectVscodeRootPath, CODE_SERVER_EXTENSIONS_DIRECTORY_NAME),
    };
}

/**
 * Writes user settings consumed by code-server before startup.
 *
 * @param options - User-data path, project path, and theme.
 */
async function writeCodeServerUserSettings(options: {
    readonly userDataDirectoryPath: string;
    readonly projectPath: string;
    readonly resolvedThemeMode: ResolvedThemeMode;
}): Promise<void> {
    const settingsDirectoryPath = join(options.userDataDirectoryPath, CODE_SERVER_SETTINGS_DIRECTORY_NAME);

    await mkdir(settingsDirectoryPath, { recursive: true });
    await writeFile(
        join(settingsDirectoryPath, CODE_SERVER_SETTINGS_FILE_NAME),
        JSON.stringify(
            {
                'git.confirmSync': false,
                'security.workspace.trust.enabled': false,
                'terminal.integrated.cwd': options.projectPath,
                'telemetry.telemetryLevel': 'off',
                'workbench.colorTheme':
                    options.resolvedThemeMode === 'DARK' ? CODE_SERVER_DARK_THEME_NAME : CODE_SERVER_LIGHT_THEME_NAME,
            },
            null,
            4,
        ),
        'utf-8',
    );
}

/**
 * Code-server command resolved from environment or the default npx package.
 */
type CodeServerCommand = {
    /**
     * Executable to spawn.
     */
    readonly command: string;

    /**
     * Arguments prepended before standard code-server flags.
     */
    readonly initialArguments: ReadonlyArray<string>;
};

/**
 * Resolves the command used to start code-server.
 *
 * @returns Code-server command.
 */
function resolveCodeServerCommand(): CodeServerCommand {
    const configuredCommand = process.env[CODE_SERVER_COMMAND_ENV]?.trim();

    if (configuredCommand) {
        return {
            command: configuredCommand,
            initialArguments: parseConfiguredCodeServerArguments(process.env[CODE_SERVER_COMMAND_ARGUMENTS_ENV]),
        };
    }

    return {
        command: 'npx',
        initialArguments: ['--yes', CODE_SERVER_NPX_PACKAGE],
    };
}

/**
 * Parses optional configured command arguments.
 *
 * @param rawArguments - JSON string-array or whitespace-separated arguments.
 * @returns Parsed arguments.
 */
function parseConfiguredCodeServerArguments(rawArguments: string | undefined): ReadonlyArray<string> {
    const normalizedArguments = rawArguments?.trim();
    if (!normalizedArguments) {
        return [];
    }

    try {
        const parsedArguments = JSON.parse(normalizedArguments) as unknown;
        if (Array.isArray(parsedArguments) && parsedArguments.every((argument) => typeof argument === 'string')) {
            return parsedArguments;
        }
    } catch {
        return normalizedArguments.split(/\s+/u);
    }

    throw new EnvironmentMismatchError(
        spaceTrim(`
            Invalid \`${CODE_SERVER_COMMAND_ARGUMENTS_ENV}\`.

            Use either a JSON string array or a whitespace-separated argument list.
        `),
    );
}

/**
 * Converts a mutable session into a browser-safe snapshot.
 *
 * @param session - Mutable browser VS Code session.
 * @returns Serializable session info.
 */
function toAgentProjectVscodeSessionInfo(session: MutableAgentProjectVscodeSession): AgentProjectVscodeSessionInfo {
    return {
        id: session.id,
        sessionKey: session.sessionKey,
        accessToken: session.accessToken,
        agentPermanentId: session.agentPermanentId,
        projectName: session.projectName,
        projectPath: session.projectPath,
        resolvedThemeMode: session.resolvedThemeMode,
        port: session.port,
        proxyBasePath: session.proxyBasePath,
        processId: session.processId,
        isRunning: session.isRunning,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
    };
}
