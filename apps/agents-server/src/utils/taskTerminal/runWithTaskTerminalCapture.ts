import { AsyncLocalStorage } from 'async_hooks';
import { format } from 'util';
import { appendTaskTerminalLogLine } from './taskTerminalLog';

/**
 * Console methods mirrored into task terminal logs.
 */
const CAPTURED_CONSOLE_LEVELS = ['debug', 'log', 'info', 'warn', 'error'] as const;

/**
 * One console level mirrored into task terminal logs.
 */
type CapturedConsoleLevel = (typeof CAPTURED_CONSOLE_LEVELS)[number];

/**
 * ANSI color prefix applied per console level so the xterm view resembles a real CLI.
 */
const CAPTURED_CONSOLE_LEVEL_ANSI_COLOR_MAP: Record<CapturedConsoleLevel, string> = {
    debug: '\x1b[2m',
    log: '',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
};

/**
 * ANSI style reset appended after each captured console line.
 */
const ANSI_STYLE_RESET = '\x1b[0m';

/**
 * Async context carried while one task is being processed.
 */
type TaskTerminalCaptureContext = {
    readonly taskId: string;
};

/**
 * Shared mutable capture state reused across requests in the server process.
 */
type TaskTerminalCaptureState = {
    readonly asyncLocalStorage: AsyncLocalStorage<TaskTerminalCaptureContext>;
    isConsolePatched: boolean;
};

/**
 * Runs one task-processing callback while mirroring its console output into the task terminal log.
 *
 * All `console.*` calls made anywhere in the async call tree of `callback` are still written to
 * the real server console and are additionally appended to the in-memory terminal log of the
 * given task, so the admin task manager can show a task-scoped CLI view in real time.
 *
 * @param taskId - Task identifier used by the admin task manager.
 * @param callback - Task-processing work to run inside the capture context.
 * @returns Result of the callback.
 */
export async function runWithTaskTerminalCapture<TResult>(
    taskId: string,
    callback: () => Promise<TResult> | TResult,
): Promise<TResult> {
    const state = getTaskTerminalCaptureState();
    ensureTaskCaptureConsolePatched(state);

    return await state.asyncLocalStorage.run({ taskId }, async () => await callback());
}

/**
 * Returns the mutable singleton state for task console capturing.
 *
 * @returns Shared capture state.
 */
function getTaskTerminalCaptureState(): TaskTerminalCaptureState {
    const globalState = globalThis as typeof globalThis & {
        __promptbookTaskTerminalCaptureState?: TaskTerminalCaptureState;
    };

    if (!globalState.__promptbookTaskTerminalCaptureState) {
        globalState.__promptbookTaskTerminalCaptureState = {
            asyncLocalStorage: new AsyncLocalStorage<TaskTerminalCaptureContext>(),
            isConsolePatched: false,
        };
    }

    return globalState.__promptbookTaskTerminalCaptureState;
}

/**
 * Patches the global console once so calls inside a capture context are mirrored per task.
 *
 * The original console behavior is always preserved; mirroring failures are swallowed so a
 * terminal-log problem can never break task processing itself.
 *
 * @param state - Shared capture state.
 */
function ensureTaskCaptureConsolePatched(state: TaskTerminalCaptureState): void {
    if (state.isConsolePatched) {
        return;
    }

    state.isConsolePatched = true;

    for (const level of CAPTURED_CONSOLE_LEVELS) {
        const originalConsoleMethod = console[level].bind(console);

        console[level] = (...consoleArguments: Array<unknown>) => {
            originalConsoleMethod(...consoleArguments);

            const captureContext = state.asyncLocalStorage.getStore();
            if (!captureContext) {
                return;
            }

            try {
                appendTaskTerminalLogLine(captureContext.taskId, formatCapturedConsoleLine(level, consoleArguments));
            } catch {
                // Note: Never let terminal-log mirroring break the actual task processing
            }
        };
    }
}

/**
 * Formats one captured console call as an ANSI-colored terminal line body.
 *
 * @param level - Captured console level.
 * @param consoleArguments - Raw console call arguments.
 * @returns Line content without timestamp and trailing newline.
 */
function formatCapturedConsoleLine(level: CapturedConsoleLevel, consoleArguments: Array<unknown>): string {
    const levelColor = CAPTURED_CONSOLE_LEVEL_ANSI_COLOR_MAP[level];
    const formattedMessage = format(...consoleArguments);

    return `${levelColor}${formattedMessage}${ANSI_STYLE_RESET}`;
}
