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
 * Serializable snapshot of one interactive harness authentication session.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export type HarnessAuthenticationSessionSnapshot = {
    /**
     * Session identifier used by the browser UI.
     */
    readonly id: string;

    /**
     * Harness being authenticated.
     */
    readonly harness: string;

    /**
     * Whether the interactive harness process is still active.
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
 *
 * @private internal utility of Agents Server Harness Auth
 */
export type HarnessAuthenticationSessionSubscriber = {
    /**
     * Called whenever new terminal output arrives.
     */
    readonly onOutput: (event: Parameters<InteractiveTerminalSessionSubscriber['onOutput']>[0]) => void;

    /**
     * Called once the session exits.
     */
    readonly onExit: (event: { readonly type: 'exit'; readonly snapshot: HarnessAuthenticationSessionSnapshot }) => void;
};

/**
 * Starts a streamed authentication session for the currently configured standalone harness.
 *
 * @param harness - Harness identifier stored in `.env`.
 * @returns Existing running session for the same harness or a new one.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export async function startHarnessAuthenticationSession(
    harness: string,
): Promise<HarnessAuthenticationSessionSnapshot> {
    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        throw new Error('The VPS installer script could not be found on this server.');
    }

    return toRequiredHarnessAuthenticationSessionSnapshot(
        startInteractiveTerminalSession({
            sessionKey: buildHarnessAuthenticationSessionKey(harness),
            title: `${harness} authentication`,
            command: 'bash',
            arguments: [scriptPath, 'authenticate-runner'],
            env: createVpsInstallerCommandEnvironment({
                isNonInteractiveModeEnabled: false,
                isProcessRestartEnabled: false,
            }),
            metadata: {
                harness,
            },
            unavailableErrorMessage: 'Interactive harness authentication is available only on the Linux VPS runtime.',
        }),
        harness,
    );
}

/**
 * Returns the latest known authentication session for a harness.
 *
 * @param harness - Harness identifier.
 * @returns Serializable session snapshot or `null`.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export function getLatestHarnessAuthenticationSession(
    harness: string,
): HarnessAuthenticationSessionSnapshot | null {
    return toHarnessAuthenticationSessionSnapshot(
        getLatestInteractiveTerminalSession(buildHarnessAuthenticationSessionKey(harness)),
        harness,
    );
}

/**
 * Looks up one authentication session by id.
 *
 * @param sessionId - Session identifier.
 * @returns Serializable session snapshot or `null`.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export function getHarnessAuthenticationSession(
    sessionId: string,
): HarnessAuthenticationSessionSnapshot | null {
    return toHarnessAuthenticationSessionSnapshot(getInteractiveTerminalSession(sessionId));
}

/**
 * Subscribes one browser connection to live terminal events.
 *
 * @param sessionId - Session identifier.
 * @param subscriber - Stream callbacks.
 * @returns Cleanup callback.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export function subscribeToHarnessAuthenticationSession(
    sessionId: string,
    subscriber: HarnessAuthenticationSessionSubscriber,
): (() => void) | null {
    return subscribeToInteractiveTerminalSession(sessionId, {
        onOutput: subscriber.onOutput,
        onExit: ({ snapshot }) =>
            subscriber.onExit({
                type: 'exit',
                snapshot: toRequiredHarnessAuthenticationSessionSnapshot(snapshot),
            }),
    });
}

/**
 * Sends interactive input to a running authentication terminal.
 *
 * @param sessionId - Session identifier.
 * @param input - Raw text to write to stdin.
 * @returns Updated session snapshot.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export function writeHarnessAuthenticationSessionInput(
    sessionId: string,
    input: string,
): HarnessAuthenticationSessionSnapshot {
    return toRequiredHarnessAuthenticationSessionSnapshot(writeInteractiveTerminalSessionInput(sessionId, input));
}

/**
 * Stops a running authentication terminal.
 *
 * @param sessionId - Session identifier.
 * @returns Updated session snapshot.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export function stopHarnessAuthenticationSession(
    sessionId: string,
): HarnessAuthenticationSessionSnapshot {
    return toRequiredHarnessAuthenticationSessionSnapshot(stopInteractiveTerminalSession(sessionId));
}

/**
 * Builds the stable logical session key for one harness authentication terminal.
 *
 * @param harness - Harness identifier.
 * @returns Stable session key.
 */
function buildHarnessAuthenticationSessionKey(harness: string): string {
    return `harness-authentication:${harness}`;
}

/**
 * Converts one generic terminal snapshot into the harness-specific browser shape.
 *
 * @param session - Generic terminal snapshot.
 * @param fallbackHarness - Harness name used when older sessions miss metadata.
 * @returns Harness-specific snapshot or `null`.
 */
function toHarnessAuthenticationSessionSnapshot(
    session: InteractiveTerminalSessionSnapshot | null,
    fallbackHarness = '',
): HarnessAuthenticationSessionSnapshot | null {
    if (!session) {
        return null;
    }

    return {
        id: session.id,
        harness: session.metadata.harness || session.metadata.agent || fallbackHarness,
        isRunning: session.isRunning,
        output: session.output,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        exitCode: session.exitCode,
        signal: session.signal,
    };
}

/**
 * Converts one generic terminal snapshot into a required harness-specific snapshot.
 *
 * @param session - Generic terminal snapshot.
 * @returns Harness-specific snapshot.
 */
function toRequiredHarnessAuthenticationSessionSnapshot(
    session: InteractiveTerminalSessionSnapshot | null,
    fallbackHarness = '',
): HarnessAuthenticationSessionSnapshot {
    const mappedSession = toHarnessAuthenticationSessionSnapshot(session, fallbackHarness);

    if (!mappedSession) {
        throw new Error('Authentication session was not found.');
    }

    return mappedSession;
}
