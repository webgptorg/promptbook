import { randomUUID } from 'crypto';
import { spawn, type ChildProcess } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
    DEFAULT_THEME_MODE,
    THEME_MODE_COOKIE_NAME,
    THEME_MODES,
    resolveThemeMode,
    type ThemeMode,
} from '../../constants/themeMode';
import type { UserInfo } from '../getCurrentUser';
import { getUserThemeModeSettingsSnapshotForUser } from '../userThemeModeSettings';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { AGENT_PROJECT_RUNTIME_HOST } from './agentProjectRuntimeConstants';
import { findFreeTcpPort } from './findFreeTcpPort';
import { waitForTcpPortListening } from './isTcpPortListening';
import { killProcessListeningOnPort } from './killProcessListeningOnPort';
import { resolveAgentProjectInfo } from './resolveAgentProjectInfo';

/**
 * Path prefix served by nginx for browser VS Code project sessions.
 */
export const AGENT_PROJECT_CODE_SERVER_PROXY_PATH_PREFIX = '__agent-project-vscode';

/**
 * Header emitted by the internal auth route with the approved local code-server port.
 */
export const AGENT_PROJECT_CODE_SERVER_AUTH_RESPONSE_PORT_HEADER = 'X-Promptbook-Code-Server-Port';

/**
 * Global key used to keep code-server sessions alive across module reloads.
 */
const AGENT_PROJECT_CODE_SERVER_REGISTRY_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_CODE_SERVER_REGISTRY__';

/**
 * Executable name installed by the standalone VPS script.
 */
const CODE_SERVER_COMMAND = 'code-server';

/**
 * Query parameter accepted by code-server for opening a folder.
 */
const CODE_SERVER_FOLDER_SEARCH_PARAM = 'folder';

/**
 * Time spent waiting for a freshly spawned code-server process to start listening.
 */
const CODE_SERVER_START_TIMEOUT_MS = 20_000;

/**
 * Polling interval while waiting for code-server to bind its port.
 */
const CODE_SERVER_START_POLL_INTERVAL_MS = 250;

/**
 * Built-in VS Code light theme matching the Agents Server light mode closely.
 */
const CODE_SERVER_LIGHT_THEME = 'Default Light Modern';

/**
 * Built-in VS Code dark theme matching the Agents Server dark mode closely.
 */
const CODE_SERVER_DARK_THEME = 'Default Dark Modern';

/**
 * Directory name used for code-server state under the Agents Server data directory.
 */
const CODE_SERVER_STATE_DIRECTORY_NAME = 'code-server';

/**
 * Session summary returned by the browser VS Code registry.
 */
export type AgentProjectCodeServerSessionInfo = {
    /**
     * Process-local session id.
     */
    readonly id: string;

    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Absolute project path opened as the VS Code workspace.
     */
    readonly projectPath: string;

    /**
     * Local code-server port.
     */
    readonly port: number;

    /**
     * Local loopback URL of the code-server process.
     */
    readonly localUrl: string;

    /**
     * Browser URL returned to the user.
     */
    readonly browserUrl: string;

    /**
     * User theme applied to VS Code settings.
     */
    readonly themeMode: ThemeMode;

    /**
     * Whether the session exposes the server terminal to a super admin.
     */
    readonly isSuperAdminTerminalEnabled: boolean;

    /**
     * Process id of code-server.
     */
    readonly processId: number | null;

    /**
     * Whether the local code-server port is accepting connections.
     */
    readonly isRunning: boolean;

    /**
     * ISO timestamp when the session was started.
     */
    readonly startedAt: string;

    /**
     * ISO timestamp when the session state was last refreshed.
     */
    readonly updatedAt: string;
};

/**
 * Options for starting browser VS Code for one agent project.
 */
export type StartAgentProjectCodeServerSessionOptions = {
    /**
     * Incoming request used to build the browser URL.
     */
    readonly request: Request;

    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Project directory name.
     */
    readonly projectName: string;

    /**
     * Current authenticated user.
     */
    readonly currentUser: UserInfo;

    /**
     * Theme mode to apply to the VS Code user data.
     */
    readonly themeMode: ThemeMode;

    /**
     * Whether the caller is the environment-backed super admin.
     */
    readonly isSuperAdmin: boolean;
};

/**
 * Project code-server registry stored on `globalThis`.
 */
type AgentProjectCodeServerRegistryState = {
    /**
     * Code-server records keyed by session id.
     */
    readonly sessionsById: Map<string, MutableAgentProjectCodeServerSessionRecord>;
};

/**
 * Global object shape used for process-wide code-server session state.
 */
type AgentProjectCodeServerRegistryGlobal = typeof globalThis & {
    [AGENT_PROJECT_CODE_SERVER_REGISTRY_GLOBAL_KEY]?: AgentProjectCodeServerRegistryState;
};

/**
 * Mutable internal code-server session record.
 */
type MutableAgentProjectCodeServerSessionRecord = {
    id: string;
    agentPermanentId: string;
    projectName: string;
    projectPath: string;
    userKey: string;
    port: number;
    localUrl: string;
    browserUrl: string;
    themeMode: ThemeMode;
    isSuperAdminTerminalEnabled: boolean;
    processId: number | null;
    isRunning: boolean;
    startedAt: string;
    updatedAt: string;
    childProcess: ChildProcess;
};

/**
 * Resolves the current user's Agents Server theme for code-server.
 *
 * @param currentUser - Current authenticated user.
 * @param request - Request that may carry the latest theme cookie.
 * @returns Theme mode to apply to VS Code.
 */
export async function resolveAgentProjectCodeServerThemeMode(
    currentUser: UserInfo,
    request: Request,
): Promise<ThemeMode> {
    const cookieThemeMode = readRequestCookie(request, THEME_MODE_COOKIE_NAME);

    if (cookieThemeMode) {
        return resolveThemeMode(cookieThemeMode);
    }

    if (typeof currentUser.id === 'number') {
        return (await getUserThemeModeSettingsSnapshotForUser(currentUser.id)).themeMode;
    }

    return DEFAULT_THEME_MODE;
}

/**
 * Starts or reuses browser VS Code for one project.
 *
 * @param options - Project, user, theme, and request details.
 * @returns Running code-server session.
 */
export async function startAgentProjectCodeServerSession(
    options: StartAgentProjectCodeServerSessionOptions,
): Promise<AgentProjectCodeServerSessionInfo> {
    if (!options.isSuperAdmin) {
        throw new NotAllowed(
            spaceTrim(`
                Browser VS Code can be opened only by a super admin.

                The embedded editor exposes write access and a server terminal for the project workspace.
            `),
        );
    }

    const project = await resolveExistingAgentProject(options.agentPermanentId, options.projectName);
    const userKey = createAgentProjectCodeServerUserKey(options.currentUser);
    const existingSession = findAgentProjectCodeServerSessionRecord({
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        userKey,
        themeMode: options.themeMode,
    });

    if (existingSession) {
        await refreshAgentProjectCodeServerSessionRecord(existingSession);

        if (existingSession.isRunning) {
            existingSession.browserUrl = createAgentProjectCodeServerBrowserUrl({
                request: options.request,
                sessionId: existingSession.id,
                port: existingSession.port,
                projectPath: existingSession.projectPath,
            });
            existingSession.updatedAt = new Date().toISOString();
            return toAgentProjectCodeServerSessionInfo(existingSession);
        }

        await terminateAgentProjectCodeServerSessionRecord(existingSession);
        getAgentProjectCodeServerRegistryState().sessionsById.delete(existingSession.id);
    }

    await terminateAgentProjectCodeServerSessionsForProjectAndUser({
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        userKey,
    });

    const sessionId = randomUUID();
    const port = await findFreeTcpPort();
    const localUrl = createAgentProjectCodeServerLocalUrl(port);
    const browserUrl = createAgentProjectCodeServerBrowserUrl({
        request: options.request,
        sessionId,
        port,
        projectPath: project.absolutePath,
    });
    const sessionDirectory = resolveAgentProjectCodeServerSessionDirectory(sessionId);
    const userDataDirectory = join(sessionDirectory, 'user-data');
    const extensionsDirectory = join(resolveAgentProjectCodeServerStateRoot(), 'extensions', sanitizePathPart(userKey));

    await Promise.all([
        mkdir(userDataDirectory, { recursive: true }),
        mkdir(extensionsDirectory, { recursive: true }),
        writeCodeServerUserSettings({
            userDataDirectory,
            projectPath: project.absolutePath,
            themeMode: options.themeMode,
        }),
    ]);

    const childProcess = spawn(
        CODE_SERVER_COMMAND,
        createCodeServerArguments({
            sessionId,
            port,
            projectPath: project.absolutePath,
            userDataDirectory,
            extensionsDirectory,
        }),
        {
            cwd: project.absolutePath,
            detached: false,
            env: createCodeServerEnvironment(project.absolutePath),
            shell: false,
            stdio: 'ignore',
            windowsHide: true,
        },
    );
    const now = new Date().toISOString();
    const sessionRecord: MutableAgentProjectCodeServerSessionRecord = {
        id: sessionId,
        agentPermanentId: options.agentPermanentId,
        projectName: project.projectName,
        projectPath: project.absolutePath,
        userKey,
        port,
        localUrl,
        browserUrl,
        themeMode: options.themeMode,
        isSuperAdminTerminalEnabled: true,
        processId: childProcess.pid ?? null,
        isRunning: false,
        startedAt: now,
        updatedAt: now,
        childProcess,
    };
    let startupError: Error | null = null;

    childProcess.once('exit', () => {
        sessionRecord.isRunning = false;
        sessionRecord.updatedAt = new Date().toISOString();
    });
    childProcess.once('error', (error) => {
        startupError = error;
        sessionRecord.isRunning = false;
        sessionRecord.updatedAt = new Date().toISOString();
    });
    childProcess.unref();

    getAgentProjectCodeServerRegistryState().sessionsById.set(sessionRecord.id, sessionRecord);

    const isListening = await waitForTcpPortListening({
        port,
        host: AGENT_PROJECT_RUNTIME_HOST,
        timeoutMs: CODE_SERVER_START_TIMEOUT_MS,
        pollIntervalMs: CODE_SERVER_START_POLL_INTERVAL_MS,
    });

    if (startupError || !isListening) {
        await terminateAgentProjectCodeServerSessionRecord(sessionRecord);
        getAgentProjectCodeServerRegistryState().sessionsById.delete(sessionRecord.id);

        throw new NotAllowed(
            spaceTrim(`
                Failed to start browser VS Code for project \`${project.projectName}\`.

                **Expected server dependency:** \`${CODE_SERVER_COMMAND}\`
                **Project path:** \`${project.absolutePath}\`

                Install or update the standalone VPS dependencies and try again.
            `),
        );
    }

    sessionRecord.isRunning = true;
    sessionRecord.updatedAt = new Date().toISOString();
    return toAgentProjectCodeServerSessionInfo(sessionRecord);
}

/**
 * Resolves a running code-server session for nginx auth.
 *
 * @param sessionId - Code-server session id.
 * @returns Running session info or `null`.
 */
export async function resolveAgentProjectCodeServerSession(
    sessionId: string,
): Promise<AgentProjectCodeServerSessionInfo | null> {
    const sessionRecord = getAgentProjectCodeServerRegistryState().sessionsById.get(sessionId);

    if (!sessionRecord) {
        return null;
    }

    await refreshAgentProjectCodeServerSessionRecord(sessionRecord);

    if (!sessionRecord.isRunning) {
        getAgentProjectCodeServerRegistryState().sessionsById.delete(sessionRecord.id);
        return null;
    }

    return toAgentProjectCodeServerSessionInfo(sessionRecord);
}

/**
 * Returns whether a current user matches the owner of a code-server session.
 *
 * @param session - Code-server session info.
 * @param currentUser - Current authenticated user.
 * @param isSuperAdmin - Whether the current request is a super-admin request.
 * @returns `true` when the request may proxy to the session.
 */
export function isAgentProjectCodeServerSessionAuthorized(options: {
    readonly session: AgentProjectCodeServerSessionInfo;
    readonly currentUser: UserInfo | null;
    readonly isSuperAdmin: boolean;
}): boolean {
    if (!options.currentUser || !options.isSuperAdmin || !options.session.isSuperAdminTerminalEnabled) {
        return false;
    }

    return createAgentProjectCodeServerUserKey(options.currentUser) === findSessionUserKey(options.session.id);
}

/**
 * Terminates all browser VS Code sessions in the current process.
 *
 * This is used by tests and process-level cleanup.
 */
export async function terminateAllAgentProjectCodeServerSessions(): Promise<void> {
    const sessionIds = [...getAgentProjectCodeServerRegistryState().sessionsById.keys()];

    await Promise.all(
        sessionIds.map(async (sessionId) => {
            const sessionRecord = getAgentProjectCodeServerRegistryState().sessionsById.get(sessionId);

            if (!sessionRecord) {
                return;
            }

            await terminateAgentProjectCodeServerSessionRecord(sessionRecord);
            getAgentProjectCodeServerRegistryState().sessionsById.delete(sessionId);
        }),
    );
}

/**
 * Resolves one existing project or throws a branded not-found error.
 */
async function resolveExistingAgentProject(agentPermanentId: string, projectName: string) {
    const project = await resolveAgentProjectInfo(agentPermanentId, projectName);

    if (!project) {
        throw new NotFoundError(
            spaceTrim(`
                Project \`${projectName}\` was not found for agent \`${agentPermanentId}\`.
            `),
        );
    }

    return project;
}

/**
 * Finds a matching reusable code-server session record.
 */
function findAgentProjectCodeServerSessionRecord(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly userKey: string;
    readonly themeMode: ThemeMode;
}): MutableAgentProjectCodeServerSessionRecord | null {
    const normalizedAgentPermanentId = options.agentPermanentId.toLowerCase();
    const normalizedProjectName = options.projectName.toLowerCase();

    for (const sessionRecord of getAgentProjectCodeServerRegistryState().sessionsById.values()) {
        if (
            sessionRecord.agentPermanentId.toLowerCase() === normalizedAgentPermanentId &&
            sessionRecord.projectName.toLowerCase() === normalizedProjectName &&
            sessionRecord.userKey === options.userKey &&
            sessionRecord.themeMode === options.themeMode
        ) {
            return sessionRecord;
        }
    }

    return null;
}

/**
 * Finds the owner key of one session.
 */
function findSessionUserKey(sessionId: string): string | null {
    return getAgentProjectCodeServerRegistryState().sessionsById.get(sessionId)?.userKey ?? null;
}

/**
 * Terminates existing code-server sessions for the same project and user.
 */
async function terminateAgentProjectCodeServerSessionsForProjectAndUser(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly userKey: string;
}): Promise<void> {
    const normalizedAgentPermanentId = options.agentPermanentId.toLowerCase();
    const normalizedProjectName = options.projectName.toLowerCase();

    await Promise.all(
        [...getAgentProjectCodeServerRegistryState().sessionsById.values()]
            .filter(
                (sessionRecord) =>
                    sessionRecord.agentPermanentId.toLowerCase() === normalizedAgentPermanentId &&
                    sessionRecord.projectName.toLowerCase() === normalizedProjectName &&
                    sessionRecord.userKey === options.userKey,
            )
            .map(async (sessionRecord) => {
                await terminateAgentProjectCodeServerSessionRecord(sessionRecord);
                getAgentProjectCodeServerRegistryState().sessionsById.delete(sessionRecord.id);
            }),
    );
}

/**
 * Refreshes one mutable code-server session record from TCP state.
 */
async function refreshAgentProjectCodeServerSessionRecord(
    sessionRecord: MutableAgentProjectCodeServerSessionRecord,
): Promise<void> {
    sessionRecord.isRunning = await waitForTcpPortListening({
        port: sessionRecord.port,
        host: AGENT_PROJECT_RUNTIME_HOST,
        timeoutMs: CODE_SERVER_START_POLL_INTERVAL_MS,
        pollIntervalMs: CODE_SERVER_START_POLL_INTERVAL_MS,
    });
    sessionRecord.updatedAt = new Date().toISOString();
}

/**
 * Terminates one mutable code-server session record.
 */
async function terminateAgentProjectCodeServerSessionRecord(
    sessionRecord: MutableAgentProjectCodeServerSessionRecord,
): Promise<void> {
    if (sessionRecord.childProcess.exitCode === null) {
        sessionRecord.childProcess.kill();
    }

    await killProcessListeningOnPort(sessionRecord.port);

    sessionRecord.isRunning = false;
    sessionRecord.updatedAt = new Date().toISOString();
}

/**
 * Creates command-line arguments for code-server.
 */
function createCodeServerArguments(options: {
    readonly sessionId: string;
    readonly port: number;
    readonly projectPath: string;
    readonly userDataDirectory: string;
    readonly extensionsDirectory: string;
}): ReadonlyArray<string> {
    return [
        '--auth',
        'none',
        '--bind-addr',
        `${AGENT_PROJECT_RUNTIME_HOST}:${options.port}`,
        '--disable-telemetry',
        '--disable-update-check',
        '--disable-workspace-trust',
        '--abs-proxy-base-path',
        `/${AGENT_PROJECT_CODE_SERVER_PROXY_PATH_PREFIX}/${options.sessionId}`,
        '--user-data-dir',
        options.userDataDirectory,
        '--extensions-dir',
        options.extensionsDirectory,
        options.projectPath,
    ];
}

/**
 * Builds the environment for code-server.
 */
function createCodeServerEnvironment(projectPath: string): NodeJS.ProcessEnv {
    return {
        ...process.env,
        PWD: projectPath,
        SHELL: process.env.SHELL || (process.platform === 'win32' ? process.env.ComSpec : '/bin/bash'),
    };
}

/**
 * Writes VS Code user settings for one code-server session.
 */
async function writeCodeServerUserSettings(options: {
    readonly userDataDirectory: string;
    readonly projectPath: string;
    readonly themeMode: ThemeMode;
}): Promise<void> {
    const userSettingsDirectory = join(options.userDataDirectory, 'User');
    const settingsPath = join(userSettingsDirectory, 'settings.json');

    await mkdir(userSettingsDirectory, { recursive: true });

    const settings = await readExistingCodeServerSettings(settingsPath);
    settings['telemetry.telemetryLevel'] = 'off';
    settings['terminal.integrated.cwd'] = options.projectPath;
    settings['workbench.preferredLightColorTheme'] = CODE_SERVER_LIGHT_THEME;
    settings['workbench.preferredDarkColorTheme'] = CODE_SERVER_DARK_THEME;

    if (options.themeMode === THEME_MODES.SYSTEM) {
        settings['window.autoDetectColorScheme'] = true;
        delete settings['workbench.colorTheme'];
    } else {
        settings['window.autoDetectColorScheme'] = false;
        settings['workbench.colorTheme'] =
            options.themeMode === THEME_MODES.DARK ? CODE_SERVER_DARK_THEME : CODE_SERVER_LIGHT_THEME;
    }

    await writeFile(settingsPath, `${JSON.stringify(settings, null, 4)}\n`, 'utf-8');
}

/**
 * Reads an existing code-server settings object.
 */
async function readExistingCodeServerSettings(settingsPath: string): Promise<Record<string, unknown>> {
    try {
        const settings = JSON.parse(await readFile(settingsPath, 'utf-8')) as unknown;

        if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
            return settings as Record<string, unknown>;
        }
    } catch {
        return {};
    }

    return {};
}

/**
 * Creates the local code-server URL for one port.
 */
function createAgentProjectCodeServerLocalUrl(port: number): string {
    return `http://${AGENT_PROJECT_RUNTIME_HOST}:${port}`;
}

/**
 * Creates the browser URL for one code-server session.
 */
function createAgentProjectCodeServerBrowserUrl(options: {
    readonly request: Request;
    readonly sessionId: string;
    readonly port: number;
    readonly projectPath: string;
}): string {
    const isProductionMode = process.env.NODE_ENV === 'production';

    if (!isProductionMode) {
        const directUrl = new URL(createAgentProjectCodeServerLocalUrl(options.port));
        directUrl.searchParams.set(CODE_SERVER_FOLDER_SEARCH_PARAM, options.projectPath);
        return directUrl.toString();
    }

    const proxiedUrl = new URL(
        `/${AGENT_PROJECT_CODE_SERVER_PROXY_PATH_PREFIX}/${encodeURIComponent(options.sessionId)}/`,
        resolvePublicRequestOrigin(options.request),
    );
    proxiedUrl.searchParams.set(CODE_SERVER_FOLDER_SEARCH_PARAM, options.projectPath);
    return proxiedUrl.toString();
}

/**
 * Resolves the public request origin behind nginx.
 */
function resolvePublicRequestOrigin(request: Request): string {
    const requestUrl = new URL(request.url);
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || requestUrl.protocol;
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const normalizedProtocol = forwardedProtocol.endsWith(':') ? forwardedProtocol : `${forwardedProtocol}:`;

    return `${normalizedProtocol}//${forwardedHost}`;
}

/**
 * Resolves the code-server state root.
 */
function resolveAgentProjectCodeServerStateRoot(): string {
    const configuredDataDirectory = process.env.PTBK_DATA_DIR?.trim();

    if (configuredDataDirectory) {
        return join(configuredDataDirectory, CODE_SERVER_STATE_DIRECTORY_NAME);
    }

    const configuredInstallDirectory = process.env.PTBK_INSTALL_DIR?.trim();

    if (configuredInstallDirectory) {
        return join(configuredInstallDirectory, '.promptbook', CODE_SERVER_STATE_DIRECTORY_NAME);
    }

    return join(process.cwd(), '.promptbook', CODE_SERVER_STATE_DIRECTORY_NAME);
}

/**
 * Resolves one session-specific code-server state directory.
 */
function resolveAgentProjectCodeServerSessionDirectory(sessionId: string): string {
    return join(resolveAgentProjectCodeServerStateRoot(), 'sessions', sessionId);
}

/**
 * Builds the stable registry owner key for a user.
 */
function createAgentProjectCodeServerUserKey(currentUser: UserInfo): string {
    if (typeof currentUser.id === 'number') {
        return `user-id-${currentUser.id}`;
    }

    return `username-${currentUser.username.toLowerCase()}`;
}

/**
 * Sanitizes a string for use as one local path segment.
 */
function sanitizePathPart(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]/gu, '_');
}

/**
 * Reads one cookie from a request header.
 */
function readRequestCookie(request: Request, cookieName: string): string | null {
    const cookieHeader = request.headers.get('cookie');

    if (!cookieHeader) {
        return null;
    }

    for (const cookiePart of cookieHeader.split(';')) {
        const [rawName, ...rawValueParts] = cookiePart.trim().split('=');

        if (rawName === cookieName) {
            return decodeCookieValue(rawValueParts.join('='));
        }
    }

    return null;
}

/**
 * Decodes one cookie value without failing the request on malformed legacy cookies.
 */
function decodeCookieValue(rawValue: string): string {
    try {
        return decodeURIComponent(rawValue);
    } catch {
        return rawValue;
    }
}

/**
 * Converts a mutable session record to a serializable info object.
 */
function toAgentProjectCodeServerSessionInfo(
    sessionRecord: MutableAgentProjectCodeServerSessionRecord,
): AgentProjectCodeServerSessionInfo {
    return {
        id: sessionRecord.id,
        agentPermanentId: sessionRecord.agentPermanentId,
        projectName: sessionRecord.projectName,
        projectPath: sessionRecord.projectPath,
        port: sessionRecord.port,
        localUrl: sessionRecord.localUrl,
        browserUrl: sessionRecord.browserUrl,
        themeMode: sessionRecord.themeMode,
        isSuperAdminTerminalEnabled: sessionRecord.isSuperAdminTerminalEnabled,
        processId: sessionRecord.processId,
        isRunning: sessionRecord.isRunning,
        startedAt: sessionRecord.startedAt,
        updatedAt: sessionRecord.updatedAt,
    };
}

/**
 * Returns the process-wide code-server session registry.
 */
function getAgentProjectCodeServerRegistryState(): AgentProjectCodeServerRegistryState {
    const registryGlobal = globalThis as AgentProjectCodeServerRegistryGlobal;
    registryGlobal[AGENT_PROJECT_CODE_SERVER_REGISTRY_GLOBAL_KEY] ??= {
        sessionsById: new Map(),
    };

    return registryGlobal[AGENT_PROJECT_CODE_SERVER_REGISTRY_GLOBAL_KEY]!;
}
