import { dirname } from 'path';
import {
    createVpsInstallerCommandEnvironment,
    resolveVpsEnvironmentFilePath,
    resolveVpsInstallerScriptPath,
} from './vpsConfiguration';
import {
    getInteractiveTerminalSession,
    getLatestInteractiveTerminalSession,
    startInteractiveTerminalSession,
    stopInteractiveTerminalSession,
    subscribeToInteractiveTerminalSession,
    type InteractiveTerminalSessionSnapshot,
    type InteractiveTerminalSessionSubscriber,
    writeInteractiveTerminalSessionInput,
} from './interactiveTerminalSession';

const SERVER_CLI_ACCESS_SESSION_KEY = 'server-cli-access';

/**
 * Serializable snapshot of one raw server CLI access session.
 */
export type ServerCliAccessSessionSnapshot = {
    /**
     * Session identifier used by the browser UI.
     */
    readonly id: string;

    /**
     * Human-readable title shown in the super-admin UI.
     */
    readonly title: string;

    /**
     * Shell binary started for the session.
     */
    readonly shell: string;

    /**
     * Working directory used when the shell starts.
     */
    readonly workingDirectory: string;

    /**
     * Whether the interactive shell process is still active.
     */
    readonly isRunning: boolean;

    /**
     * Buffered session output shown in the admin terminal.
     */
    readonly output: string;

    /**
     * Session start timestamp in ISO format.
     */
    readonly startedAt: string;

    /**
     * Session finish timestamp in ISO format, when available.
     */
    readonly finishedAt: string | null;

    /**
     * Process exit code once the session has finished.
     */
    readonly exitCode: number | null;

    /**
     * Process signal once the session has finished.
     */
    readonly signal: NodeJS.Signals | null;
};

/**
 * Browser stream callbacks used by one subscribed CLI-access UI client.
 */
export type ServerCliAccessSessionSubscriber = {
    /**
     * Called whenever new terminal output arrives.
     */
    readonly onOutput: (event: Parameters<InteractiveTerminalSessionSubscriber['onOutput']>[0]) => void;

    /**
     * Called once the shell exits.
     */
    readonly onExit: (event: { readonly type: 'exit'; readonly snapshot: ServerCliAccessSessionSnapshot }) => void;
};

/**
 * Starts or reconnects to the raw shell session exposed to the super-admin UI.
 *
 * @returns Existing running session or a new shell session.
 */
export async function startServerCliAccessSession(): Promise<ServerCliAccessSessionSnapshot> {
    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        throw new Error('The VPS installer script could not be found on this server.');
    }

    return toRequiredServerCliAccessSessionSnapshot(
        startInteractiveTerminalSession({
            sessionKey: SERVER_CLI_ACCESS_SESSION_KEY,
            title: 'Server CLI Access',
            command: 'bash',
            arguments: [scriptPath, 'cli-shell'],
            env: createVpsInstallerCommandEnvironment({
                isNonInteractiveModeEnabled: false,
                isProcessRestartEnabled: false,
            }),
            metadata: {
                shell: 'bash',
                workingDirectory: dirname(resolveVpsEnvironmentFilePath()),
            },
            unavailableErrorMessage: 'Raw CLI access is available only on the Linux VPS runtime.',
        }),
    );
}

/**
 * Returns the latest raw CLI session snapshot when one exists.
 *
 * @returns Latest CLI access session or `null`.
 */
export function getLatestServerCliAccessSession(): ServerCliAccessSessionSnapshot | null {
    return toServerCliAccessSessionSnapshot(getLatestInteractiveTerminalSession(SERVER_CLI_ACCESS_SESSION_KEY));
}

/**
 * Looks up one CLI access session by id.
 *
 * @param sessionId - Session identifier.
 * @returns Session snapshot or `null`.
 */
export function getServerCliAccessSession(sessionId: string): ServerCliAccessSessionSnapshot | null {
    return toServerCliAccessSessionSnapshot(getInteractiveTerminalSession(sessionId));
}

/**
 * Subscribes one browser connection to live raw-shell events.
 *
 * @param sessionId - Session identifier.
 * @param subscriber - Stream callbacks.
 * @returns Cleanup callback.
 */
export function subscribeToServerCliAccessSession(
    sessionId: string,
    subscriber: ServerCliAccessSessionSubscriber,
): (() => void) | null {
    return subscribeToInteractiveTerminalSession(sessionId, {
        onOutput: subscriber.onOutput,
        onExit: ({ snapshot }) =>
            subscriber.onExit({ type: 'exit', snapshot: toRequiredServerCliAccessSessionSnapshot(snapshot) }),
    });
}

/**
 * Sends raw terminal input to the running CLI access shell.
 *
 * @param sessionId - Session identifier.
 * @param input - Raw text or control characters to write to stdin.
 * @returns Updated session snapshot.
 */
export function writeServerCliAccessSessionInput(sessionId: string, input: string): ServerCliAccessSessionSnapshot {
    return toRequiredServerCliAccessSessionSnapshot(writeInteractiveTerminalSessionInput(sessionId, input));
}

/**
 * Stops the active raw-shell session.
 *
 * @param sessionId - Session identifier.
 * @returns Updated session snapshot.
 */
export function stopServerCliAccessSession(sessionId: string): ServerCliAccessSessionSnapshot {
    return toRequiredServerCliAccessSessionSnapshot(stopInteractiveTerminalSession(sessionId));
}

/**
 * Converts one generic terminal snapshot into the CLI-access browser shape.
 *
 * @param session - Generic terminal snapshot.
 * @returns CLI access snapshot or `null`.
 */
function toServerCliAccessSessionSnapshot(
    session: InteractiveTerminalSessionSnapshot | null,
): ServerCliAccessSessionSnapshot | null {
    if (!session) {
        return null;
    }

    return {
        id: session.id,
        title: session.title,
        shell: session.metadata.shell || 'bash',
        workingDirectory: session.metadata.workingDirectory || '',
        isRunning: session.isRunning,
        output: session.output,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        exitCode: session.exitCode,
        signal: session.signal,
    };
}

/**
 * Converts one generic terminal snapshot into a required CLI-access snapshot.
 *
 * @param session - Generic terminal snapshot.
 * @returns CLI access snapshot.
 */
function toRequiredServerCliAccessSessionSnapshot(
    session: InteractiveTerminalSessionSnapshot | null,
): ServerCliAccessSessionSnapshot {
    const mappedSession = toServerCliAccessSessionSnapshot(session);

    if (!mappedSession) {
        throw new Error('CLI access session was not found.');
    }

    return mappedSession;
}
