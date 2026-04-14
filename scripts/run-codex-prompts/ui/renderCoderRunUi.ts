import colors from 'colors';
import moment from 'moment';
import { clearLine, cursorTo } from 'readline';
import { getPauseState, requestPause, requestResume } from '../common/waitForPause';
import { CoderRunUiState } from './CoderRunUiState';

/**
 * Refresh interval for the terminal UI in milliseconds.
 *
 * @private internal constant of coder run UI
 */
const UI_REFRESH_INTERVAL_MS = 200;

/**
 * Character width used for the text progress bar.
 *
 * @private internal constant of coder run UI
 */
const PROGRESS_BAR_WIDTH = 40;

/**
 * Maximum number of output lines reserved for agent output in the UI.
 *
 * @private internal constant of coder run UI
 */
const MAX_VISIBLE_OUTPUT_LINES = 8;

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
 * Strips ANSI escape codes from a string.
 *
 * @private internal utility of coder run UI
 */
function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Returns the usable terminal width, capped at 80.
 *
 * @private internal utility of coder run UI
 */
function getTerminalWidth(): number {
    return Math.min(process.stdout.columns || 80, 80);
}

/**
 * Builds a text progress bar string from a percentage.
 *
 * @private internal utility of coder run UI
 */
function buildProgressBar(percentage: number): string {
    const filled = Math.round((percentage / 100) * PROGRESS_BAR_WIDTH);
    const empty = PROGRESS_BAR_WIDTH - filled;
    return colors.green('\u2588'.repeat(filled)) + colors.gray('\u2591'.repeat(empty)) + ` ${percentage}%`;
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
            cleanup: () => {},
        };
    }

    // --- Console interception ---

    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    let isCapturing = false;

    console.info = (...args: Array<unknown>): void => {
        if (isCapturing) {
            state.addAgentOutput(args.map(String).join(' '));
        }
        // In UI mode, non-captured output is intentionally suppressed
        // so it does not interfere with the repainted frame.
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

    // --- Keyboard input (pause) ---

    const readline = require('readline') as typeof import('readline');
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    const keypressHandler = (_str: string, key: { ctrl?: boolean; name?: string }): void => {
        if (key.ctrl && key.name === 'c') {
            cleanup();
            process.exit(0);
        }
        if (key.name === 'p') {
            const current = getPauseState();
            if (current === 'RUNNING') {
                requestPause();
            } else {
                requestResume();
            }
        }
    };

    process.stdin.on('keypress', keypressHandler);

    // --- Rendering ---

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
            const lines = buildFrame();

            // Move cursor up to clear the previous frame.
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

            // Clear any leftover lines from a previous longer frame.
            if (lines.length < previousFrameLineCount) {
                for (let i = lines.length; i < previousFrameLineCount; i++) {
                    process.stdout.write('\n');
                    clearLine(process.stdout, 0);
                    cursorTo(process.stdout, 0);
                }
                // Move back up to the end of the current frame.
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

    /**
     * Builds the complete frame as an array of terminal lines.
     */
    function buildFrame(): string[] {
        const w = getTerminalWidth();
        const sep = colors.gray('\u2500'.repeat(w - 2));
        const spinner = SPINNER_FRAMES[spinnerFrame]!;
        const {
            config,
            phase,
            currentPromptLabel,
            currentAttempt,
            maxAttempts,
            statusMessage,
            agentOutputLines,
            errors,
        } = state;
        const progress = state.getProgress();
        const isPaused = getPauseState() !== 'RUNNING';
        const isActive = phase === 'running' || phase === 'verifying' || phase === 'loading';

        const lines: string[] = [];

        // --- Branding ---
        lines.push(colors.bold.cyan('\u2728 Promptbook Coder'));

        // --- Config ---
        let configLine1 = `Agent: ${colors.bold.green(config.agentName)}`;
        if (config.modelName) {
            configLine1 += `  \u2502  Model: ${colors.bold(config.modelName)}`;
        }
        if (config.thinkingLevel) {
            configLine1 += `  \u2502  Thinking: ${colors.bold(config.thinkingLevel)}`;
        }
        lines.push(configLine1);

        let configLine2 = '';
        if (config.context) {
            configLine2 += `Context: ${colors.yellow(config.context)}  \u2502  `;
        }
        configLine2 += `Priority: \u2265${config.priority}`;
        if (config.testCommand) {
            configLine2 += `  \u2502  Test: ${colors.gray(config.testCommand)}`;
        }
        lines.push(configLine2);

        // --- Separator ---
        lines.push(sep);

        // --- Progress ---
        const progressSummary = [
            `${progress.sessionDone}/${progress.sessionTotal} Prompts (${progress.totalPrompts} total)`,
            `${progress.elapsedText}/${progress.estimatedTotalText}`,
            `Est. done ${progress.estimatedLabel}`,
        ].join(' \u2502 ');
        lines.push(progressSummary);
        lines.push(buildProgressBar(progress.percentage));

        // --- Separator ---
        lines.push(sep);

        // --- Current prompt ---
        if (currentPromptLabel) {
            const spinnerPrefix = isActive ? colors.yellow(`${spinner} `) : '  ';
            lines.push(spinnerPrefix + colors.bold(currentPromptLabel));
            lines.push(colors.gray(`Attempt ${currentAttempt}/${maxAttempts} \u2502 ${statusMessage}`));
        } else {
            lines.push(colors.gray(statusMessage));
        }

        // --- Agent output ---
        if (agentOutputLines.length > 0) {
            lines.push('');
            lines.push(colors.gray.bold('Agent output:'));
            const visibleLines = agentOutputLines.slice(-MAX_VISIBLE_OUTPUT_LINES);
            for (const line of visibleLines) {
                const cleanLine = stripAnsi(line);
                // Truncate to terminal width.
                const truncated = cleanLine.length > w - 2 ? cleanLine.slice(0, w - 5) + '...' : cleanLine;
                lines.push(colors.gray(truncated));
            }
        }

        // --- Errors ---
        if (errors.length > 0) {
            lines.push('');
            for (const err of errors) {
                lines.push(colors.red(`\u2717 ${err}`));
            }
        }

        // --- Separator ---
        lines.push(sep);

        // --- Controls ---
        const pauseLabel = isPaused
            ? colors.bgYellow.black(' PAUSED ') + colors.gray(' [P] Resume  \u2502  Ctrl+C Exit')
            : colors.gray('[P] Pause  \u2502  Ctrl+C Exit');
        lines.push(pauseLabel);

        return lines;
    }

    // Initial render.
    process.stdout.write('\n');
    render();
    const interval = setInterval(scheduleRender, UI_REFRESH_INTERVAL_MS);

    // Listen for state changes and schedule a re-render (debounced).
    state.on('change', scheduleRender);

    // --- Cleanup ---

    function cleanup(): void {
        clearInterval(interval);
        state.off('change', scheduleRender);
        process.stdin.off('keypress', keypressHandler);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        isCapturing = false;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;

        // Render one final frame so the user sees the last state.
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
        cleanup,
    };
}

// Note: [💞] Ignore a discrepancy between file name and entity name
