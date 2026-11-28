import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { spaceTrim } from 'spacetrim';

const MAX_SESSION_OUTPUT_LENGTH = 200_000;
const SESSION_RETENTION_MILLISECONDS = 30 * 60 * 1000;

/**
 * Serializable snapshot of one interactive terminal session.
 */
export type InteractiveTerminalSessionSnapshot = {
    /**
     * Session identifier used by the browser UI.
     */
    readonly id: string;

    /**
     * Stable logical key reused to reconnect to the latest session of the same purpose.
     */
    readonly sessionKey: string;

    /**
     * Human-readable title shown by the admin UI.
     */
    readonly title: string;

    /**
     * Browser-safe session metadata.
     */
    readonly metadata: Readonly<Record<string, string>>;

    /**
     * Whether the interactive process is still active.
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
 * Output event emitted while the interactive terminal is running.
 */
export type InteractiveTerminalOutputEvent = {
    readonly type: 'output';
    readonly chunk: string;
};

/**
 * Exit event emitted when the interactive terminal finishes.
 */
export type InteractiveTerminalExitEvent = {
    readonly type: 'exit';
    readonly snapshot: InteractiveTerminalSessionSnapshot;
};

/**
 * Browser stream callbacks used by one subscribed UI client.
 */
export type InteractiveTerminalSessionSubscriber = {
    /**
     * Called whenever new terminal output arrives.
     */
    readonly onOutput: (event: InteractiveTerminalOutputEvent) => void;

    /**
     * Called once the session exits.
     */
    readonly onExit: (event: InteractiveTerminalExitEvent) => void;
};

/**
 * Options used when starting one managed terminal session.
 */
export type StartInteractiveTerminalSessionOptions = {
    /**
     * Stable key used to reuse the currently running session of the same purpose.
     */
    readonly sessionKey: string;

    /**
     * Human-readable title shown by the admin UI.
     */
    readonly title: string;

    /**
     * Executable path or command name to spawn.
     */
    readonly command: string;

    /**
     * Raw process arguments.
     */
    readonly arguments?: ReadonlyArray<string>;

    /**
     * Working directory for the interactive process.
     */
    readonly cwd?: string;

    /**
     * Child-process environment.
     */
    readonly env?: NodeJS.ProcessEnv;

    /**
     * Browser-safe session metadata.
     */
    readonly metadata?: Readonly<Record<string, string>>;

    /**
     * Error shown when the current runtime cannot support the terminal.
     */
    readonly unavailableErrorMessage?: string;
};

/**
 * Internal mutable session state stored in-process.
 */
type InteractiveTerminalSession = {
    readonly id: string;
    readonly sessionKey: string;
    readonly title: string;
    readonly metadata: Readonly<Record<string, string>>;
    readonly process: ChildProcessWithoutNullStreams;
    readonly events: EventEmitter<{
        output: [InteractiveTerminalOutputEvent];
        exit: [InteractiveTerminalExitEvent];
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
type InteractiveTerminalState = {
    readonly sessionsById: Map<string, InteractiveTerminalSession>;
    readonly latestSessionIdByKey: Map<string, string>;
};

/**
 * Starts one managed terminal session or reconnects to the running session with the same key.
 *
 * @param options - Terminal process settings.
 * @returns Existing running session for the same key or a new one.
 */
export function startInteractiveTerminalSession(
    options: StartInteractiveTerminalSessionOptions,
): InteractiveTerminalSessionSnapshot {
    const existingSession = getLatestInteractiveTerminalSession(options.sessionKey);
    if (existingSession?.isRunning) {
        return existingSession;
    }

    if (process.platform !== 'linux') {
        throw new Error(options.unavailableErrorMessage || 'Interactive terminal access is available only on Linux.');
    }

    const sessionId = randomUUID();
    const childProcess = spawn(options.command, [...(options.arguments || [])], {
        cwd: options.cwd,
        env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            ...options.env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const session: InteractiveTerminalSession = {
        id: sessionId,
        sessionKey: options.sessionKey,
        title: options.title,
        metadata: options.metadata || {},
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

    const state = getInteractiveTerminalState();
    state.sessionsById.set(sessionId, session);
    state.latestSessionIdByKey.set(options.sessionKey, sessionId);

    childProcess.stdout.setEncoding('utf-8');
    childProcess.stderr.setEncoding('utf-8');
    childProcess.stdout.on('data', (chunk: string) => appendInteractiveTerminalOutput(session, chunk));
    childProcess.stderr.on('data', (chunk: string) => appendInteractiveTerminalOutput(session, chunk));
    childProcess.on('close', (exitCode, signal) => finalizeInteractiveTerminalSession(session, exitCode, signal));
    childProcess.on('error', (error) => {
        appendInteractiveTerminalOutput(
            session,
            spaceTrim(`
                Failed to start the interactive terminal process.

                ${error.message}
            `) + '\n',
        );
    });

    return createInteractiveTerminalSessionSnapshot(session);
}

/**
 * Returns the latest known session snapshot for one logical terminal key.
 *
 * @param sessionKey - Stable logical session key.
 * @returns Serializable session snapshot or `null`.
 */
export function getLatestInteractiveTerminalSession(sessionKey: string): InteractiveTerminalSessionSnapshot | null {
    const sessionId = getInteractiveTerminalState().latestSessionIdByKey.get(sessionKey);
    if (!sessionId) {
        return null;
    }

    return getInteractiveTerminalSession(sessionId);
}

/**
 * Looks up one managed terminal session by id.
 *
 * @param sessionId - Session identifier.
 * @returns Serializable session snapshot or `null`.
 */
export function getInteractiveTerminalSession(sessionId: string): InteractiveTerminalSessionSnapshot | null {
    const session = getInteractiveTerminalState().sessionsById.get(sessionId);
    return session ? createInteractiveTerminalSessionSnapshot(session) : null;
}

/**
 * Subscribes one browser connection to live terminal events.
 *
 * @param sessionId - Session identifier.
 * @param subscriber - Stream callbacks.
 * @returns Cleanup callback.
 */
export function subscribeToInteractiveTerminalSession(
    sessionId: string,
    subscriber: InteractiveTerminalSessionSubscriber,
): (() => void) | null {
    const session = getInteractiveTerminalState().sessionsById.get(sessionId);
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
 * Sends raw terminal input to a running managed session.
 *
 * @param sessionId - Session identifier.
 * @param input - Raw text or control characters to write to stdin.
 * @returns Updated session snapshot.
 */
export function writeInteractiveTerminalSessionInput(
    sessionId: string,
    input: string,
): InteractiveTerminalSessionSnapshot {
    const session = getRequiredInteractiveTerminalSession(sessionId);

    if (!session.isRunning) {
        throw new Error('The terminal session has already finished.');
    }

    session.process.stdin.write(input);
    return createInteractiveTerminalSessionSnapshot(session);
}

/**
 * Stops one running managed terminal session.
 *
 * @param sessionId - Session identifier.
 * @returns Updated session snapshot.
 */
export function stopInteractiveTerminalSession(sessionId: string): InteractiveTerminalSessionSnapshot {
    const session = getRequiredInteractiveTerminalSession(sessionId);

    if (session.isRunning) {
        session.process.kill('SIGTERM');
    }

    return createInteractiveTerminalSessionSnapshot(session);
}

/**
 * Returns the mutable singleton state for managed terminal sessions.
 *
 * @returns Shared in-memory session state.
 */
function getInteractiveTerminalState(): InteractiveTerminalState {
    const globalState = globalThis as typeof globalThis & {
        __promptbookInteractiveTerminalState?: InteractiveTerminalState;
    };

    if (!globalState.__promptbookInteractiveTerminalState) {
        globalState.__promptbookInteractiveTerminalState = {
            sessionsById: new Map(),
            latestSessionIdByKey: new Map(),
        };
    }

    return globalState.__promptbookInteractiveTerminalState;
}

/**
 * Appends streamed output while keeping the session buffer size bounded.
 *
 * @param session - Active terminal session.
 * @param rawChunk - Terminal chunk from stdout or stderr.
 */
function appendInteractiveTerminalOutput(session: InteractiveTerminalSession, rawChunk: string | Buffer): void {
    const chunk = normalizeInteractiveTerminalOutput(rawChunk.toString());
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
 * Preserves streamed terminal output for the xterm browser renderer.
 *
 * @param output - Raw process output chunk.
 * @returns Raw terminal text with ANSI control sequences intact.
 */
function normalizeInteractiveTerminalOutput(output: string): string {
    return output;
}

/**
 * Marks one terminal session as finished and schedules retention cleanup.
 *
 * @param session - Finished terminal session.
 * @param exitCode - Process exit code.
 * @param signal - Process signal.
 */
function finalizeInteractiveTerminalSession(
    session: InteractiveTerminalSession,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
): void {
    session.isRunning = false;
    session.finishedAt = new Date();
    session.exitCode = exitCode;
    session.signal = signal;

    session.events.emit('exit', {
        type: 'exit',
        snapshot: createInteractiveTerminalSessionSnapshot(session),
    });

    if (session.cleanupTimeout) {
        clearTimeout(session.cleanupTimeout);
    }

    session.cleanupTimeout = setTimeout(() => {
        const state = getInteractiveTerminalState();
        state.sessionsById.delete(session.id);
        if (state.latestSessionIdByKey.get(session.sessionKey) === session.id) {
            state.latestSessionIdByKey.delete(session.sessionKey);
        }
    }, SESSION_RETENTION_MILLISECONDS);
}

/**
 * Reads one required mutable session and throws when missing.
 *
 * @param sessionId - Session identifier.
 * @returns Mutable session state.
 */
function getRequiredInteractiveTerminalSession(sessionId: string): InteractiveTerminalSession {
    const session = getInteractiveTerminalState().sessionsById.get(sessionId);
    if (!session) {
        throw new Error('Terminal session was not found.');
    }

    return session;
}

/**
 * Converts mutable terminal state into a browser-safe snapshot.
 *
 * @param session - Mutable in-memory session.
 * @returns Serializable session snapshot.
 */
function createInteractiveTerminalSessionSnapshot(
    session: InteractiveTerminalSession,
): InteractiveTerminalSessionSnapshot {
    return {
        id: session.id,
        sessionKey: session.sessionKey,
        title: session.title,
        metadata: session.metadata,
        isRunning: session.isRunning,
        output: session.output,
        startedAt: session.startedAt.toISOString(),
        finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
        exitCode: session.exitCode,
        signal: session.signal,
    };
}
