import { createVpsInstallerCommandEnvironment, resolveVpsInstallerScriptPath } from './vpsConfiguration';
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

/**
 * Serializable snapshot of one interactive code-runner authentication session.
 */
export type CodeRunnerAuthenticationSessionSnapshot = {
    /**
     * Session identifier used by the browser UI.
     */
    readonly id: string;

    /**
     * Runner being authenticated.
     */
    readonly agent: string;

    /**
     * Whether the interactive runner process is still active.
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
 * Browser stream callbacks used by one subscribed UI client.
 */
export type CodeRunnerAuthenticationSessionSubscriber = {
    /**
     * Called whenever new terminal output arrives.
     */
    readonly onOutput: (event: Parameters<InteractiveTerminalSessionSubscriber['onOutput']>[0]) => void;

    /**
     * Called once the session exits.
     */
    readonly onExit: (event: { readonly type: 'exit'; readonly snapshot: CodeRunnerAuthenticationSessionSnapshot }) => void;
};

/**
 * Starts a streamed authentication session for the currently configured standalone runner.
 *
 * @param agent - Runner identifier stored in `.env`.
 * @returns Existing running session for the same runner or a new one.
 */
export async function startCodeRunnerAuthenticationSession(
    agent: string,
): Promise<CodeRunnerAuthenticationSessionSnapshot> {
    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        throw new Error('The VPS installer script could not be found on this server.');
    }

    return toRequiredCodeRunnerAuthenticationSessionSnapshot(
        startInteractiveTerminalSession({
            sessionKey: buildCodeRunnerAuthenticationSessionKey(agent),
            title: `${agent} authentication`,
            command: 'bash',
            arguments: [scriptPath, 'authenticate-runner'],
            env: createVpsInstallerCommandEnvironment({
                isNonInteractiveModeEnabled: false,
                isProcessRestartEnabled: false,
            }),
            metadata: {
                agent,
            },
            unavailableErrorMessage: 'Interactive code-runner authentication is available only on the Linux VPS runtime.',
        }),
        agent,
    );
}

/**
 * Returns the latest known authentication session for a runner.
 *
 * @param agent - Runner identifier.
 * @returns Serializable session snapshot or `null`.
 */
export function getLatestCodeRunnerAuthenticationSession(
    agent: string,
): CodeRunnerAuthenticationSessionSnapshot | null {
    return toCodeRunnerAuthenticationSessionSnapshot(
        getLatestInteractiveTerminalSession(buildCodeRunnerAuthenticationSessionKey(agent)),
        agent,
    );
}

/**
 * Looks up one authentication session by id.
 *
 * @param sessionId - Session identifier.
 * @returns Serializable session snapshot or `null`.
 */
export function getCodeRunnerAuthenticationSession(
    sessionId: string,
): CodeRunnerAuthenticationSessionSnapshot | null {
    return toCodeRunnerAuthenticationSessionSnapshot(getInteractiveTerminalSession(sessionId));
}

/**
 * Subscribes one browser connection to live terminal events.
 *
 * @param sessionId - Session identifier.
 * @param subscriber - Stream callbacks.
 * @returns Cleanup callback.
 */
export function subscribeToCodeRunnerAuthenticationSession(
    sessionId: string,
    subscriber: CodeRunnerAuthenticationSessionSubscriber,
): (() => void) | null {
    return subscribeToInteractiveTerminalSession(sessionId, {
        onOutput: subscriber.onOutput,
        onExit: ({ snapshot }) =>
            subscriber.onExit({
                type: 'exit',
                snapshot: toRequiredCodeRunnerAuthenticationSessionSnapshot(snapshot),
            }),
    });
}

/**
 * Sends interactive input to a running authentication terminal.
 *
 * @param sessionId - Session identifier.
 * @param input - Raw text to write to stdin.
 * @returns Updated session snapshot.
 */
export function writeCodeRunnerAuthenticationSessionInput(
    sessionId: string,
    input: string,
): CodeRunnerAuthenticationSessionSnapshot {
    return toRequiredCodeRunnerAuthenticationSessionSnapshot(writeInteractiveTerminalSessionInput(sessionId, input));
}

/**
 * Stops a running authentication terminal.
 *
 * @param sessionId - Session identifier.
 * @returns Updated session snapshot.
 */
export function stopCodeRunnerAuthenticationSession(
    sessionId: string,
): CodeRunnerAuthenticationSessionSnapshot {
    return toRequiredCodeRunnerAuthenticationSessionSnapshot(stopInteractiveTerminalSession(sessionId));
}

/**
 * Builds the stable logical session key for one runner authentication terminal.
 *
 * @param agent - Runner identifier.
 * @returns Stable session key.
 */
function buildCodeRunnerAuthenticationSessionKey(agent: string): string {
    return `code-runner-authentication:${agent}`;
}

/**
 * Converts one generic terminal snapshot into the runner-specific browser shape.
 *
 * @param session - Generic terminal snapshot.
 * @param fallbackAgent - Agent name used when older sessions miss metadata.
 * @returns Runner-specific snapshot or `null`.
 */
function toCodeRunnerAuthenticationSessionSnapshot(
    session: InteractiveTerminalSessionSnapshot | null,
    fallbackAgent = '',
): CodeRunnerAuthenticationSessionSnapshot | null {
    if (!session) {
        return null;
    }

    return {
        id: session.id,
        agent: session.metadata.agent || fallbackAgent,
        isRunning: session.isRunning,
        output: session.output,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        exitCode: session.exitCode,
        signal: session.signal,
    };
}

/**
 * Converts one generic terminal snapshot into a required runner-specific snapshot.
 *
 * @param session - Generic terminal snapshot.
 * @returns Runner-specific snapshot.
 */
function toRequiredCodeRunnerAuthenticationSessionSnapshot(
    session: InteractiveTerminalSessionSnapshot | null,
    fallbackAgent = '',
): CodeRunnerAuthenticationSessionSnapshot {
    const mappedSession = toCodeRunnerAuthenticationSessionSnapshot(session, fallbackAgent);

    if (!mappedSession) {
        throw new Error('Authentication session was not found.');
    }

    return mappedSession;
}
