import { EventEmitter } from 'events';

/**
 * Maximum buffered terminal output kept in memory for one task.
 */
const MAX_TASK_TERMINAL_OUTPUT_LENGTH = 200_000;

/**
 * How long a finished task terminal stays readable for post-mortem inspection.
 */
const TASK_TERMINAL_RETENTION_MILLISECONDS = 30 * 60 * 1000;

/**
 * Maximum number of task terminals tracked at once before the oldest ones are evicted.
 */
const MAX_TRACKED_TASK_TERMINAL_COUNT = 200;

/**
 * ANSI dim style used for terminal line timestamps.
 */
const ANSI_STYLE_DIM = '\x1b[2m';

/**
 * ANSI style reset used after styled terminal fragments.
 */
const ANSI_STYLE_RESET = '\x1b[0m';

/**
 * Serializable snapshot of one task-scoped terminal log.
 *
 * The shape intentionally matches the shared `AdminTerminalSession` browser contract
 * so the existing admin terminal SSE helper and xterm renderer can be reused.
 */
export type TaskTerminalLogSnapshot = {
    /**
     * Task identifier the terminal output belongs to.
     */
    readonly id: string;

    /**
     * Whether the task is still expected to produce more output.
     */
    readonly isRunning: boolean;

    /**
     * Buffered task terminal output.
     */
    readonly output: string;

    /**
     * ISO timestamp of the first captured output.
     */
    readonly startedAt: string;

    /**
     * ISO timestamp when the task terminal was marked finished, when available.
     */
    readonly finishedAt: string | null;

    /**
     * Synthetic exit code once the task finished (`0` on success, `1` otherwise).
     */
    readonly exitCode: number | null;

    /**
     * Always `null` — task terminals are not backed by one dedicated OS process.
     */
    readonly signal: null;
};

/**
 * Output event emitted while one task terminal is collecting output.
 */
export type TaskTerminalLogOutputEvent = {
    readonly type: 'output';
    readonly chunk: string;
};

/**
 * Exit event emitted when one task terminal is marked finished.
 */
export type TaskTerminalLogExitEvent = {
    readonly type: 'exit';
    readonly snapshot: TaskTerminalLogSnapshot;
};

/**
 * Browser stream callbacks used by one subscribed task terminal client.
 */
export type TaskTerminalLogSubscriber = {
    /**
     * Called whenever new task terminal output arrives.
     */
    readonly onOutput: (event: TaskTerminalLogOutputEvent) => void;

    /**
     * Called once the task terminal is marked finished.
     */
    readonly onExit: (event: TaskTerminalLogExitEvent) => void;
};

/**
 * Internal mutable per-task terminal state stored in-process.
 */
type TaskTerminalLogEntry = {
    readonly taskId: string;
    readonly events: EventEmitter<{
        output: [TaskTerminalLogOutputEvent];
        exit: [TaskTerminalLogExitEvent];
    }>;
    readonly startedAt: Date;
    cleanupTimeout: NodeJS.Timeout | null;
    output: string;
    isFinished: boolean;
    finishedAt: Date | null;
    exitCode: number | null;
    updatedAtMs: number;
};

/**
 * Shared in-memory task terminal state reused across requests in the server process.
 */
type TaskTerminalLogState = {
    readonly entriesByTaskId: Map<string, TaskTerminalLogEntry>;
};

/**
 * Appends one output chunk to the terminal log of the given task.
 *
 * The task terminal log is created lazily on the first appended chunk. A previously
 * finished terminal is reopened so retried tasks keep collecting output into the
 * same buffer.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @param chunk - Raw terminal text to append.
 */
export function appendTaskTerminalLogOutput(taskId: string, chunk: string): void {
    if (!chunk) {
        return;
    }

    const entry = ensureTaskTerminalLogEntry(taskId);

    if (entry.isFinished) {
        reopenTaskTerminalLogEntry(entry);
    }

    entry.output = (entry.output + chunk).slice(-MAX_TASK_TERMINAL_OUTPUT_LENGTH);
    entry.updatedAtMs = Date.now();
    entry.events.emit('output', {
        type: 'output',
        chunk,
    });
}

/**
 * Appends one timestamped line to the terminal log of the given task.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @param message - Line content, optionally containing ANSI styling.
 */
export function appendTaskTerminalLogLine(taskId: string, message: string): void {
    appendTaskTerminalLogOutput(
        taskId,
        `${ANSI_STYLE_DIM}${new Date().toISOString()}${ANSI_STYLE_RESET} ${message}\n`,
    );
}

/**
 * Marks one task terminal as finished and notifies live subscribers.
 *
 * Does nothing when no output was ever captured for the task in this process.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @param options - Finish metadata.
 */
export function markTaskTerminalLogFinished(taskId: string, options: { readonly isSuccessful: boolean }): void {
    const entry = getTaskTerminalLogState().entriesByTaskId.get(taskId);
    if (!entry || entry.isFinished) {
        return;
    }

    entry.isFinished = true;
    entry.finishedAt = new Date();
    entry.exitCode = options.isSuccessful ? 0 : 1;
    entry.updatedAtMs = Date.now();

    entry.events.emit('exit', {
        type: 'exit',
        snapshot: createTaskTerminalLogSnapshot(entry),
    });

    scheduleTaskTerminalLogCleanup(entry);
}

/**
 * Reads the buffered terminal log snapshot for one task.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @returns Snapshot or `null` when nothing was captured for the task in this process.
 */
export function getTaskTerminalLogSnapshot(taskId: string): TaskTerminalLogSnapshot | null {
    const entry = getTaskTerminalLogState().entriesByTaskId.get(taskId);
    return entry ? createTaskTerminalLogSnapshot(entry) : null;
}

/**
 * Subscribes one browser connection to live task terminal events.
 *
 * The entry is created eagerly so subscribers attached before the first output
 * chunk still receive everything the task produces later.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @param subscriber - Stream callbacks.
 * @returns Cleanup callback.
 */
export function subscribeToTaskTerminalLog(taskId: string, subscriber: TaskTerminalLogSubscriber): () => void {
    const entry = ensureTaskTerminalLogEntry(taskId);

    entry.events.on('output', subscriber.onOutput);
    entry.events.on('exit', subscriber.onExit);

    return () => {
        entry.events.off('output', subscriber.onOutput);
        entry.events.off('exit', subscriber.onExit);
    };
}

/**
 * Returns the mutable singleton state for task terminal logs.
 *
 * @returns Shared in-memory task terminal state.
 */
function getTaskTerminalLogState(): TaskTerminalLogState {
    const globalState = globalThis as typeof globalThis & {
        __promptbookTaskTerminalLogState?: TaskTerminalLogState;
    };

    if (!globalState.__promptbookTaskTerminalLogState) {
        globalState.__promptbookTaskTerminalLogState = {
            entriesByTaskId: new Map(),
        };
    }

    return globalState.__promptbookTaskTerminalLogState;
}

/**
 * Reads or creates the mutable terminal entry for one task.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @returns Mutable terminal entry.
 */
function ensureTaskTerminalLogEntry(taskId: string): TaskTerminalLogEntry {
    const state = getTaskTerminalLogState();
    const existingEntry = state.entriesByTaskId.get(taskId);
    if (existingEntry) {
        return existingEntry;
    }

    evictStaleTaskTerminalLogEntries(state);

    const entry: TaskTerminalLogEntry = {
        taskId,
        events: new EventEmitter(),
        startedAt: new Date(),
        cleanupTimeout: null,
        output: '',
        isFinished: false,
        finishedAt: null,
        exitCode: null,
        updatedAtMs: Date.now(),
    };

    state.entriesByTaskId.set(taskId, entry);
    return entry;
}

/**
 * Reopens one finished terminal entry so a retried task keeps appending output.
 *
 * @param entry - Mutable terminal entry.
 */
function reopenTaskTerminalLogEntry(entry: TaskTerminalLogEntry): void {
    entry.isFinished = false;
    entry.finishedAt = null;
    entry.exitCode = null;

    if (entry.cleanupTimeout) {
        clearTimeout(entry.cleanupTimeout);
        entry.cleanupTimeout = null;
    }
}

/**
 * Schedules retention cleanup for one finished terminal entry.
 *
 * @param entry - Finished terminal entry.
 */
function scheduleTaskTerminalLogCleanup(entry: TaskTerminalLogEntry): void {
    if (entry.cleanupTimeout) {
        clearTimeout(entry.cleanupTimeout);
    }

    entry.cleanupTimeout = setTimeout(() => {
        const state = getTaskTerminalLogState();
        if (state.entriesByTaskId.get(entry.taskId) === entry) {
            state.entriesByTaskId.delete(entry.taskId);
        }
    }, TASK_TERMINAL_RETENTION_MILLISECONDS);
    entry.cleanupTimeout.unref?.();
}

/**
 * Evicts the least recently updated entries when the registry grows past its cap.
 *
 * Finished entries are evicted first so terminals of still-running tasks survive bursts.
 *
 * @param state - Shared in-memory task terminal state.
 */
function evictStaleTaskTerminalLogEntries(state: TaskTerminalLogState): void {
    if (state.entriesByTaskId.size < MAX_TRACKED_TASK_TERMINAL_COUNT) {
        return;
    }

    const entriesOldestFirst = [...state.entriesByTaskId.values()].sort(
        (leftEntry, rightEntry) =>
            Number(rightEntry.isFinished) - Number(leftEntry.isFinished) ||
            leftEntry.updatedAtMs - rightEntry.updatedAtMs,
    );

    for (const entry of entriesOldestFirst) {
        if (state.entriesByTaskId.size < MAX_TRACKED_TASK_TERMINAL_COUNT) {
            break;
        }

        if (entry.cleanupTimeout) {
            clearTimeout(entry.cleanupTimeout);
        }
        state.entriesByTaskId.delete(entry.taskId);
    }
}

/**
 * Converts one mutable terminal entry into a browser-safe snapshot.
 *
 * @param entry - Mutable terminal entry.
 * @returns Serializable terminal snapshot.
 */
function createTaskTerminalLogSnapshot(entry: TaskTerminalLogEntry): TaskTerminalLogSnapshot {
    return {
        id: entry.taskId,
        isRunning: !entry.isFinished,
        output: entry.output,
        startedAt: entry.startedAt.toISOString(),
        finishedAt: entry.finishedAt ? entry.finishedAt.toISOString() : null,
        exitCode: entry.exitCode,
        signal: null,
    };
}
