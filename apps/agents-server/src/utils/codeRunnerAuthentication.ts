import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { spaceTrim } from 'spacetrim';
import { createVpsInstallerCommandEnvironment, resolveVpsInstallerScriptPath } from './vpsConfiguration';

const MAX_SESSION_OUTPUT_LENGTH = 200_000;
const SESSION_RETENTION_MILLISECONDS = 30 * 60 * 1000;

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
 * Output event emitted while the authentication terminal is running.
 */
type CodeRunnerAuthenticationOutputEvent = {
    readonly type: 'output';
    readonly chunk: string;
};

/**
 * Exit event emitted when the authentication terminal finishes.
 */
type CodeRunnerAuthenticationExitEvent = {
    readonly type: 'exit';
    readonly snapshot: CodeRunnerAuthenticationSessionSnapshot;
};

/**
 * Internal mutable session state stored in-process.
 */
type CodeRunnerAuthenticationSession = {
    readonly id: string;
    readonly agent: string;
    readonly process: ChildProcessWithoutNullStreams;
    readonly events: EventEmitter<{
        output: [CodeRunnerAuthenticationOutputEvent];
        exit: [CodeRunnerAuthenticationExitEvent];
    }>;
    readonly startedAt: Date;
    cleanupTimeout: NodeJS.Timeout | null;
    output: string;
    isRunning: boolean;
    finishedAt: Date | null;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
};

/**
 * Shared in-memory state reused across requests in the standalone server process.
 */
type CodeRunnerAuthenticationState = {
    readonly sessionsById: Map<string, CodeRunnerAuthenticationSession>;
    readonly latestSessionIdByAgent: Map<string, string>;
};

/**
 * Browser stream callbacks used by one subscribed UI client.
 */
export type CodeRunnerAuthenticationSessionSubscriber = {
    /**
     * Called whenever new terminal output arrives.
     */
    readonly onOutput: (event: CodeRunnerAuthenticationOutputEvent) => void;

    /**
     * Called once the session exits.
     */
    readonly onExit: (event: CodeRunnerAuthenticationExitEvent) => void;
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
    const existingSession = getLatestCodeRunnerAuthenticationSession(agent);
    if (existingSession?.isRunning) {
        return existingSession;
    }

    if (process.platform !== 'linux') {
        throw new Error('Interactive code-runner authentication is available only on the Linux VPS runtime.');
    }

    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        throw new Error('The VPS installer script could not be found on this server.');
    }

    const sessionId = randomUUID();
    const childProcess = spawn('bash', [scriptPath, 'authenticate-runner'], {
        env: createVpsInstallerCommandEnvironment({
            isNonInteractiveModeEnabled: false,
            isProcessRestartEnabled: false,
        }),
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const session: CodeRunnerAuthenticationSession = {
        id: sessionId,
        agent,
        process: childProcess,
        events: new EventEmitter(),
        startedAt: new Date(),
        cleanupTimeout: null,
        output: '',
        isRunning: true,
        finishedAt: null,
        exitCode: null,
        signal: null,
    };

    const state = getCodeRunnerAuthenticationState();
    state.sessionsById.set(sessionId, session);
    state.latestSessionIdByAgent.set(agent, sessionId);

    childProcess.stdout.setEncoding('utf-8');
    childProcess.stderr.setEncoding('utf-8');
    childProcess.stdout.on('data', (chunk: string) => appendCodeRunnerAuthenticationOutput(session, chunk));
    childProcess.stderr.on('data', (chunk: string) => appendCodeRunnerAuthenticationOutput(session, chunk));
    childProcess.on('close', (exitCode, signal) => finalizeCodeRunnerAuthenticationSession(session, exitCode, signal));
    childProcess.on('error', (error) => {
        appendCodeRunnerAuthenticationOutput(
            session,
            spaceTrim(`
                Failed to start the code-runner authentication process.

                ${error.message}
            `) + '\n',
        );
    });

    return createCodeRunnerAuthenticationSessionSnapshot(session);
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
    const sessionId = getCodeRunnerAuthenticationState().latestSessionIdByAgent.get(agent);
    if (!sessionId) {
        return null;
    }

    return getCodeRunnerAuthenticationSession(sessionId);
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
    const session = getCodeRunnerAuthenticationState().sessionsById.get(sessionId);
    return session ? createCodeRunnerAuthenticationSessionSnapshot(session) : null;
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
    const session = getCodeRunnerAuthenticationState().sessionsById.get(sessionId);
    if (!session) {
        return null;
    }

    session.events.on('output', subscriber.onOutput);
    session.events.on('exit', subscriber.onExit);

    return () => {
        session.events.off('output', subscriber.onOutput);
        session.events.off('exit', subscriber.onExit);
    };
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
    const session = getRequiredCodeRunnerAuthenticationSession(sessionId);

    if (!session.isRunning) {
        throw new Error('The authentication session has already finished.');
    }

    session.process.stdin.write(input);
    return createCodeRunnerAuthenticationSessionSnapshot(session);
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
    const session = getRequiredCodeRunnerAuthenticationSession(sessionId);

    if (session.isRunning) {
        session.process.kill('SIGTERM');
    }

    return createCodeRunnerAuthenticationSessionSnapshot(session);
}

/**
 * Returns the mutable singleton state for authentication sessions.
 *
 * @returns Shared in-memory session state.
 */
function getCodeRunnerAuthenticationState(): CodeRunnerAuthenticationState {
    const globalState = globalThis as typeof globalThis & {
        __promptbookCodeRunnerAuthenticationState?: CodeRunnerAuthenticationState;
    };

    if (!globalState.__promptbookCodeRunnerAuthenticationState) {
        globalState.__promptbookCodeRunnerAuthenticationState = {
            sessionsById: new Map(),
            latestSessionIdByAgent: new Map(),
        };
    }

    return globalState.__promptbookCodeRunnerAuthenticationState;
}

/**
 * Appends terminal output while keeping the buffer size bounded.
 *
 * @param session - Active authentication session.
 * @param rawChunk - Terminal chunk from stdout or stderr.
 */
function appendCodeRunnerAuthenticationOutput(
    session: CodeRunnerAuthenticationSession,
    rawChunk: string | Buffer,
): void {
    const chunk = normalizeCodeRunnerAuthenticationOutput(rawChunk.toString());
    if (!chunk) {
        return;
    }

    session.output = (session.output + chunk).slice(-MAX_SESSION_OUTPUT_LENGTH);
    session.events.emit('output', {
        type: 'output',
        chunk,
    });
}

/**
 * Normalizes streamed terminal output for browser rendering.
 *
 * @param output - Raw process output chunk.
 * @returns UI-friendly terminal text.
 */
function normalizeCodeRunnerAuthenticationOutput(output: string): string {
    return output.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
}

/**
 * Marks one authentication session as finished and schedules retention cleanup.
 *
 * @param session - Finished authentication session.
 * @param exitCode - Process exit code.
 * @param signal - Process signal.
 */
function finalizeCodeRunnerAuthenticationSession(
    session: CodeRunnerAuthenticationSession,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
): void {
    session.isRunning = false;
    session.finishedAt = new Date();
    session.exitCode = exitCode;
    session.signal = signal;

    session.events.emit('exit', {
        type: 'exit',
        snapshot: createCodeRunnerAuthenticationSessionSnapshot(session),
    });

    if (session.cleanupTimeout) {
        clearTimeout(session.cleanupTimeout);
    }

    session.cleanupTimeout = setTimeout(() => {
        getCodeRunnerAuthenticationState().sessionsById.delete(session.id);
    }, SESSION_RETENTION_MILLISECONDS);
}

/**
 * Reads one required mutable session and throws when missing.
 *
 * @param sessionId - Session identifier.
 * @returns Mutable session state.
 */
function getRequiredCodeRunnerAuthenticationSession(sessionId: string): CodeRunnerAuthenticationSession {
    const session = getCodeRunnerAuthenticationState().sessionsById.get(sessionId);
    if (!session) {
        throw new Error('Authentication session was not found.');
    }

    return session;
}

/**
 * Converts mutable session state into a browser-safe snapshot.
 *
 * @param session - Mutable in-memory session.
 * @returns Serializable session snapshot.
 */
function createCodeRunnerAuthenticationSessionSnapshot(
    session: CodeRunnerAuthenticationSession,
): CodeRunnerAuthenticationSessionSnapshot {
    return {
        id: session.id,
        agent: session.agent,
        isRunning: session.isRunning,
        output: session.output,
        startedAt: session.startedAt.toISOString(),
        finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
        exitCode: session.exitCode,
        signal: session.signal,
    };
}
