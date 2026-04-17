import moment from 'moment';
import { clearLine, cursorTo } from 'readline';
import { getPauseState, requestPause, requestResume } from '../common/waitForPause';
import { buildCoderRunUiFrame } from './buildCoderRunUiFrame';
import { CoderRunUiState } from './CoderRunUiState';

/**
 * Refresh interval for the terminal UI in milliseconds.
 *
 * @private internal constant of coder run UI
 */
const UI_REFRESH_INTERVAL_MS = 200;

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
 * The UI reserves a fixed number of terminal lines and repaints them periodically.
 * Between repaints, any console output from runners is captured and fed into the
 * scrolling agent-output area.
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
    let previousFrameLineCount = 0;
    let isRendering = false;
    let renderScheduled = false;

    /**
     * Schedules a render on the next tick if one isn't already pending.
     * Prevents overlapping renders that cause cursor desync.
     */
    function scheduleRender(): void {
        if (renderScheduled) {
            return;
        }

        renderScheduled = true;
        setImmediate(() => {
            renderScheduled = false;
            render();
        });
    }

    /**
     * Clears previously rendered lines and writes a new frame.
     */
    function render(): void {
        if (isRendering) {
            return;
        }

        isRendering = true;

        try {
            const lines = buildCoderRunUiFrame({
                terminalWidth: getTerminalWidth(),
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

            if (previousFrameLineCount > 0) {
                process.stdout.write(`\x1b[${previousFrameLineCount}A`);
            }

            for (let i = 0; i < lines.length; i++) {
                clearLine(process.stdout, 0);
                cursorTo(process.stdout, 0);
                process.stdout.write(lines[i]!);
                if (i < lines.length - 1) {
                    process.stdout.write('\n');
                }
            }

            if (lines.length < previousFrameLineCount) {
                for (let i = lines.length; i < previousFrameLineCount; i++) {
                    process.stdout.write('\n');
                    clearLine(process.stdout, 0);
                    cursorTo(process.stdout, 0);
                }

                const overshoot = previousFrameLineCount - lines.length;
                if (overshoot > 0) {
                    process.stdout.write(`\x1b[${overshoot}A`);
                }
            }

            previousFrameLineCount = lines.length;
            spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
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

    process.stdout.write('\n');
    render();
    const interval = setInterval(scheduleRender, UI_REFRESH_INTERVAL_MS);
    state.on('change', scheduleRender);

    /**
     * Tears down the terminal UI and restores console / stdin state.
     */
    function cleanup(): void {
        clearInterval(interval);
        state.off('change', scheduleRender);
        process.stdin.off('keypress', keypressHandler);
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

        render();
        process.stdout.write('\n');
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
