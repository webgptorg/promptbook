import moment from 'moment';
import { clearLine, cursorTo } from 'readline';
import { getPauseState, requestPause, requestResume } from '../common/waitForPause';
import { buildCoderRunUiFrame } from './buildCoderRunUiFrame';
import { CoderRunUiState } from './CoderRunUiState';
import { getCoderRunUiAutoRefreshInterval } from './coderRunUiRefresh';

/**
 * Spinner animation frames.
 *
 * @private internal constant of coder run UI
 */
const SPINNER_FRAMES = [
    '\u280B',
    '\u2819',
    '\u2839',
    '\u2838',
    '\u283C',
    '\u2834',
    '\u2826',
    '\u2827',
    '\u2807',
    '\u280F',
];

/**
 * Returns the usable terminal width, capped at 96.
 *
 * @private internal utility of coder run UI
 */
function getTerminalWidth(): number {
    return Math.min(process.stdout.columns || 80, 96);
}

/**
 * Handle returned by `renderCoderRunUi` that exposes the state and lifecycle controls.
 *
 * @private internal type of coder run UI
 */
export type CoderRunUiHandle = {
    /** Reactive state the caller updates throughout execution. */
    readonly state: CoderRunUiState;

    /** Enables console interception so runner output flows into the UI agent-output area. */
    startCapturingAgentOutput(): void;

    /** Disables console interception so normal logging resumes. */
    stopCapturingAgentOutput(): void;

    /** Waits for Enter without leaving the rich terminal UI. */
    waitForEnter(actionLabel: string): Promise<void>;

    /** Tears down the UI and restores original console methods. */
    cleanup(): void;
};

/**
 * Boots the ANSI terminal UI for `ptbk coder run`.
 *
 * The UI reserves a fixed number of terminal lines and refreshes them incrementally.
 * While a prompt is actively running, it schedules lightweight timed refreshes for
 * the spinner/progress area; otherwise it redraws only when real state changes arrive.
 * Any console output from runners is captured and fed into the scrolling agent-output area.
 *
 * On non-interactive (non-TTY) terminals the UI is skipped entirely and
 * only the state object is provided.
 *
 * @private internal entry point of coder run UI
 */
export function renderCoderRunUi(startTime: moment.Moment): CoderRunUiHandle {
    const state = new CoderRunUiState(startTime);

    if (!process.stdout.isTTY) {
        return {
            state,
            startCapturingAgentOutput: () => {},
            stopCapturingAgentOutput: () => {},
            waitForEnter: async () => {},
            cleanup: () => {},
        };
    }

    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    let isCapturing = false;
    let pendingEnterResolver: (() => void) | undefined;

    console.info = (...args: Array<unknown>): void => {
        if (isCapturing) {
            state.addAgentOutput(args.map(String).join(' '));
        }
    };

    console.warn = (...args: Array<unknown>): void => {
        if (isCapturing) {
            state.addAgentOutput(args.map(String).join(' '));
        }
    };

    console.error = (...args: Array<unknown>): void => {
        if (isCapturing) {
            state.addError(args.map(String).join(' '));
        }
    };

    console.log = (...args: Array<unknown>): void => {
        if (isCapturing) {
            state.addAgentOutput(args.map(String).join(' '));
        }
    };

    const readline = require('readline') as typeof import('readline');
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    let spinnerFrame = 0;
    let previousFrameLines: string[] = [];
    let isRendering = false;
    let renderScheduled = false;
    let autoRefreshTimeout: NodeJS.Timeout | undefined;
    let isDisposed = false;

    /**
     * Schedules a render on the next tick if one isn't already pending.
     * Prevents overlapping renders that cause cursor desync.
     */
    function scheduleRender(): void {
        if (renderScheduled || isDisposed) {
            return;
        }

        renderScheduled = true;
        setImmediate(() => {
            renderScheduled = false;
            if (isDisposed) {
                return;
            }

            render();
        });
    }

    /**
     * Re-schedules automatic animation refreshes only while the frame can change by itself.
     */
    function scheduleAutoRefresh(): void {
        if (autoRefreshTimeout) {
            clearTimeout(autoRefreshTimeout);
            autoRefreshTimeout = undefined;
        }

        const autoRefreshInterval = getCoderRunUiAutoRefreshInterval(state.phase, getPauseState());
        if (autoRefreshInterval === undefined) {
            return;
        }

        autoRefreshTimeout = setTimeout(() => {
            autoRefreshTimeout = undefined;
            scheduleRender();
        }, autoRefreshInterval);
    }

    /**
     * Moves the cursor relative to the bottom of the current frame and rewrites one line in place.
     */
    function rewriteFrameLine(frameLineCount: number, lineIndex: number, line: string): void {
        const linesUpFromBottom = Math.max(0, frameLineCount - 1 - lineIndex);

        if (linesUpFromBottom > 0) {
            process.stdout.write(`\x1b[${linesUpFromBottom}A`);
        }

        clearLine(process.stdout, 0);
        cursorTo(process.stdout, 0);
        process.stdout.write(line);
        cursorTo(process.stdout, 0);

        if (linesUpFromBottom > 0) {
            process.stdout.write(`\x1b[${linesUpFromBottom}B`);
            cursorTo(process.stdout, 0);
        }
    }

    /**
     * Fully rewrites the reserved frame area.
     */
    function renderFullFrame(lines: readonly string[]): void {
        const previousFrameLineCount = previousFrameLines.length;
        const linesToRewriteCount = Math.max(previousFrameLineCount, lines.length);

        if (previousFrameLineCount > 1) {
            process.stdout.write(`\x1b[${previousFrameLineCount - 1}A`);
        }

        for (let i = 0; i < linesToRewriteCount; i++) {
            clearLine(process.stdout, 0);
            cursorTo(process.stdout, 0);
            process.stdout.write(lines[i] ?? '');

            if (i < linesToRewriteCount - 1) {
                process.stdout.write('\n');
            }
        }

        const clearedTrailingLines = linesToRewriteCount - lines.length;
        if (clearedTrailingLines > 0) {
            process.stdout.write(`\x1b[${clearedTrailingLines}A`);
        }

        cursorTo(process.stdout, 0);
    }

    /**
     * Updates only the frame rows whose visible content changed.
     */
    function renderChangedLines(lines: readonly string[]): void {
        for (let i = 0; i < lines.length; i++) {
            if (previousFrameLines[i] === lines[i]) {
                continue;
            }

            rewriteFrameLine(lines.length, i, lines[i]!);
        }
    }

    /**
     * Builds the current frame snapshot from the latest state.
     */
    function buildFrameLines(): string[] {
        return buildCoderRunUiFrame({
            terminalWidth: getTerminalWidth(),
            animationFrame: spinnerFrame,
            spinner: SPINNER_FRAMES[spinnerFrame]!,
            pauseState: getPauseState(),
            config: state.config,
            phase: state.phase,
            currentPromptLabel: state.currentPromptLabel,
            currentAttempt: state.currentAttempt,
            maxAttempts: state.maxAttempts,
            statusMessage: state.statusMessage,
            detailLines: state.detailLines,
            pendingEnterLabel: state.pendingEnterLabel,
            agentOutputLines: state.agentOutputLines,
            errors: state.errors,
            progress: state.getProgress(),
        });
    }

    /**
     * Clears previously rendered lines and writes a new frame only where needed.
     */
    function render(options?: { skipAutoRefresh?: boolean }): void {
        if (isRendering || isDisposed) {
            return;
        }

        isRendering = true;

        try {
            const lines = buildFrameLines();

            if (previousFrameLines.length === 0 || previousFrameLines.length !== lines.length) {
                renderFullFrame(lines);
            } else {
                renderChangedLines(lines);
            }

            previousFrameLines = [...lines];
            spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
            if (!options?.skipAutoRefresh) {
                scheduleAutoRefresh();
            }
        } finally {
            isRendering = false;
        }
    }

    const keypressHandler = (_str: string, key: { ctrl?: boolean; name?: string }): void => {
        if (key.ctrl && key.name === 'c') {
            cleanup();
            process.exit(0);
        }

        if (key.name === 'p') {
            if (getPauseState() === 'RUNNING') {
                requestPause();
            } else {
                requestResume();
            }

            scheduleRender();
            return;
        }

        if ((key.name === 'return' || key.name === 'enter') && pendingEnterResolver) {
            const resolvePendingEnter = pendingEnterResolver;
            pendingEnterResolver = undefined;
            state.setPendingEnterLabel(undefined);
            resolvePendingEnter();
        }
    };

    process.stdin.on('keypress', keypressHandler);
    process.stdout.on('resize', scheduleRender);

    process.stdout.write('\n');
    render();
    state.on('change', scheduleRender);

    /**
     * Tears down the terminal UI and restores console / stdin state.
     */
    function cleanup(): void {
        if (isDisposed) {
            return;
        }

        if (autoRefreshTimeout) {
            clearTimeout(autoRefreshTimeout);
            autoRefreshTimeout = undefined;
        }

        state.off('change', scheduleRender);
        process.stdin.off('keypress', keypressHandler);
        process.stdout.off('resize', scheduleRender);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        const resolvePendingEnter = pendingEnterResolver;
        pendingEnterResolver = undefined;
        resolvePendingEnter?.();

        isCapturing = false;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;

        render({ skipAutoRefresh: true });
        process.stdout.write('\n');
        isDisposed = true;
    }

    return {
        state,
        startCapturingAgentOutput(): void {
            isCapturing = true;
        },
        stopCapturingAgentOutput(): void {
            isCapturing = false;
        },
        waitForEnter(actionLabel: string): Promise<void> {
            if (pendingEnterResolver) {
                throw new Error('Coder run UI is already waiting for Enter.');
            }

            state.setPendingEnterLabel(actionLabel);
            scheduleRender();

            return new Promise((resolve) => {
                pendingEnterResolver = () => {
                    scheduleRender();
                    resolve();
                };
            });
        },
        cleanup,
    };
}

// Note: [💞] Ignore a discrepancy between file name and entity name
