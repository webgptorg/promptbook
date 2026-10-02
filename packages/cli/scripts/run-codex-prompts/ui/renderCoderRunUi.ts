import moment from 'moment';
import { emitKeypressEvents } from 'readline';
import { applyCoderRunControlKey } from '../common/applyCoderRunControlKey';
import {
    CODER_RUN_CONTROL_FEEDBACK_DURATION_MS,
    type CoderRunControlFeedback,
} from '../common/CoderRunControlFeedback';
import { getEndAfterCurrentPromptState, getPauseState, getPauseTargetLabel } from '../common/waitForPause';
import { buildCoderRunUiFrame, type BuildCoderRunUiFrameOptions } from './buildCoderRunUiFrame';
import { buildCoderRunUiTerminalFrameUpdate } from './buildCoderRunUiTerminalFrameUpdate';
import { CoderRunUiState } from './CoderRunUiState';
import { getCoderRunUiAutoRefreshInterval } from './coderRunUiRefresh';
import { subscribeToLiveScriptOutput } from '../common/runGoScript/captureLiveScriptOutput';
import { buildCoderRunUiViewport } from './buildCoderRunUiViewport';
import { getCoderOutputScrollMaximum } from './output/buildCoderOutputLines';
import { MAX_VISIBLE_OUTPUT_LINES } from './buildRunUiFrameShared';

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
 * Fallback terminal width used when the current terminal does not report one.
 */
const DEFAULT_TERMINAL_WIDTH = 80;

/**
 * Returns the number of columns reported by the current terminal.
 *
 * The frame builder owns clamping and reserves its trailing auto-wrap safety column.
 *
 * @private internal utility of coder run UI
 */
function getTerminalColumnCount(): number {
    return process.stdout.columns || DEFAULT_TERMINAL_WIDTH;
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
export function renderCoderRunUi(
    startTime: moment.Moment,
    options: {
        readonly buildFrameLines?: (options: BuildCoderRunUiFrameOptions) => string[];
        readonly state?: CoderRunUiState;
        /** Long-lived hosts may supply their own durable policy while reusing the output renderer. */
        readonly controls?: {
            readonly snapshot: () => Pick<
                BuildCoderRunUiFrameOptions,
                'pauseState' | 'pauseTargetLabel' | 'isEndAfterCurrentPromptRequested'
            >;
            readonly applyKey: (keyName: string | undefined) => CoderRunControlFeedback | undefined;
            readonly interrupt: () => void;
        };
    } = {},
): CoderRunUiHandle {
    const state = options.state ?? new CoderRunUiState(startTime);
    const buildFrameLinesFromState = options.buildFrameLines || buildCoderRunUiFrame;
    const isCoderDashboard = buildFrameLinesFromState === buildCoderRunUiFrame;

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
    if (isCoderDashboard) {
        state.outputMode = 'normal';
        state.outputScrollOffset = 0;
    }
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    let activeCaptureCount = 0;
    let pendingEnterResolver: (() => void) | undefined;
    let dashboardScrollOffset = 0;
    let dashboardScrollMaximum = 0;
    const stopOutputCapture = isCoderDashboard
        ? subscribeToLiveScriptOutput((chunk, source) => {
              if (activeCaptureCount === 0) return false;
              state.addScriptOutput(chunk, source);
              return true;
          })
        : () => {};

    console.info = (...args: Array<unknown>): void => {
        if (activeCaptureCount > 0) {
            state.addAgentOutput(args.map(String).join(' '));
        }
    };

    console.warn = (...args: Array<unknown>): void => {
        if (activeCaptureCount > 0) {
            state.addAgentOutput(args.map(String).join(' '), 'warning');
        }
    };

    console.error = (...args: Array<unknown>): void => {
        if (activeCaptureCount > 0) {
            state.addError(args.map(String).join(' '));
        }
    };

    console.log = (...args: Array<unknown>): void => {
        if (activeCaptureCount > 0) {
            state.addAgentOutput(args.map(String).join(' '));
        }
    };

    emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    let spinnerFrame = 0;
    const animationStartTimeMs = Date.now();
    let previousFrameLines: string[] = [];
    let isRendering = false;
    let renderScheduled = false;
    let autoRefreshTimeout: NodeJS.Timeout | undefined;
    let controlFeedbackTimeout: NodeJS.Timeout | undefined;
    let isDisposed = false;
    let isFrameResetRequested = false;

    /** Terminal resize can reflow old rows, so relative cursor coordinates are no longer reliable. */
    function handleResize(): void {
        isFrameResetRequested = isCoderDashboard;
        scheduleRender();
    }

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

        const isAgentVisualAnimated = state.agentVisual?.isAnimated === true;
        const autoRefreshInterval = getCoderRunUiAutoRefreshInterval(
            state.phase,
            options.controls?.snapshot().pauseState ?? getPauseState(),
            isAgentVisualAnimated,
        );
        if (autoRefreshInterval === undefined) {
            return;
        }

        autoRefreshTimeout = setTimeout(() => {
            autoRefreshTimeout = undefined;
            scheduleRender();
        }, autoRefreshInterval);
    }

    /**
     * Builds the current frame snapshot from the latest state.
     */
    function buildFrameLines(): string[] {
        return buildFrameLinesFromState({
            terminalWidth: getTerminalColumnCount(),
            animationFrame: spinnerFrame,
            animationTimeMs: Date.now() - animationStartTimeMs,
            spinner: SPINNER_FRAMES[spinnerFrame]!,
            ...(options.controls?.snapshot() ?? {
                pauseState: getPauseState(),
                pauseTargetLabel: getPauseTargetLabel(),
                isEndAfterCurrentPromptRequested: getEndAfterCurrentPromptState(),
            }),
            config: state.config,
            subscriptionUsage: state.subscriptionUsage,
            agentVisual: state.agentVisual,
            phase: state.phase,
            currentPromptLabel: state.currentPromptLabel,
            currentScriptPaths: state.currentScriptPaths,
            currentAttempt: state.currentAttempt,
            maxAttempts: state.maxAttempts,
            statusMessage: state.statusMessage,
            detailLines: state.detailLines,
            messagePreviewLines: state.messagePreviewLines,
            messagePreviewSections: state.messagePreviewSections,
            agentStatusLines: state.agentStatusLines,
            agentStatusTableRows: state.agentStatusTableRows,
            pendingEnterLabel: state.pendingEnterLabel,
            agentOutputLines: state.agentOutputLines,
            output: state.output,
            outputMode: state.outputMode,
            outputScrollOffset: state.outputScrollOffset,
            errors: state.errors,
            controlFeedback: state.controlFeedback,
            progress: state.getProgress(),
        });
    }

    /**
     * Answers one pressed control key in the frame and hides that answer again after a short moment.
     */
    function showControlFeedback(controlFeedback: CoderRunControlFeedback): void {
        clearControlFeedbackTimeout();

        // Note: Every state change re-renders the frame, so the answer appears with the very next frame
        state.setControlFeedback(controlFeedback);

        controlFeedbackTimeout = setTimeout(() => {
            controlFeedbackTimeout = undefined;
            state.setControlFeedback(undefined);
        }, CODER_RUN_CONTROL_FEEDBACK_DURATION_MS);
    }

    /**
     * Stops the timer which hides the currently shown control answer.
     */
    function clearControlFeedbackTimeout(): void {
        if (controlFeedbackTimeout === undefined) {
            return;
        }

        clearTimeout(controlFeedbackTimeout);
        controlFeedbackTimeout = undefined;
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
            const fullFrame = buildFrameLines();
            const viewport =
                isCoderDashboard && process.stdout.rows
                    ? buildCoderRunUiViewport(
                          fullFrame,
                          getTerminalColumnCount(),
                          process.stdout.rows,
                          dashboardScrollOffset,
                      )
                    : { lines: fullFrame, maxScrollOffset: 0 };
            const lines = viewport.lines;
            dashboardScrollMaximum = viewport.maxScrollOffset;
            dashboardScrollOffset = Math.min(dashboardScrollOffset, dashboardScrollMaximum);

            const terminalFrameUpdate = buildCoderRunUiTerminalFrameUpdate({
                previousFrameLines: isFrameResetRequested ? [] : previousFrameLines,
                nextFrameLines: lines,
            });

            if (terminalFrameUpdate !== undefined) {
                process.stdout.write((isFrameResetRequested ? '\x1b[H\x1b[2J' : '') + terminalFrameUpdate);
            }
            isFrameResetRequested = false;

            previousFrameLines = [...lines];
            spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
            if (!options?.skipAutoRefresh) {
                scheduleAutoRefresh();
            }
        } finally {
            isRendering = false;
        }
    }

    const keypressHandler = (_str: string, key: { ctrl?: boolean; meta?: boolean; name?: string }): void => {
        if (key.ctrl && key.name === 'c') {
            if (options.controls) {
                options.controls.interrupt();
                return;
            }
            cleanup();
            process.exit(0);
        }

        // Presentation keys return before runner controls and Enter acknowledgement are considered.
        if (isCoderDashboard && !key.ctrl && !key.meta) {
            if (key.name === 'o') {
                state.toggleOutputMode();
                showControlFeedback({
                    controlKey: 'O',
                    message: state.outputMode === 'raw' ? 'Raw output' : 'Normal output',
                    tone: 'info',
                });
                return;
            }
            if (key.name === 'up' || key.name === 'down' || key.name === 'end') {
                state.scrollOutput(
                    key.name === 'end' ? -state.outputScrollOffset : key.name === 'up' ? 3 : -3,
                    getCoderOutputScrollMaximum(state.output.rawChunks, state.outputMode, MAX_VISIBLE_OUTPUT_LINES),
                );
                return;
            }
            if (key.name === 'pageup' || key.name === 'pagedown') {
                dashboardScrollOffset = Math.max(
                    0,
                    Math.min(dashboardScrollMaximum, dashboardScrollOffset + (key.name === 'pageup' ? 5 : -5)),
                );
                scheduleRender();
                return;
            }
        }

        // Note: [🏹] The very same key handling is shared with the plain console mode, see `applyCoderRunControlKey`
        const controlFeedback = options.controls
            ? options.controls.applyKey(key.name)
            : applyCoderRunControlKey(key.name);

        if (controlFeedback !== undefined) {
            showControlFeedback(controlFeedback);
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
    process.stdout.on('resize', handleResize);

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

        clearControlFeedbackTimeout();
        state.off('change', scheduleRender);
        process.stdin.off('keypress', keypressHandler);
        process.stdout.off('resize', handleResize);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        const resolvePendingEnter = pendingEnterResolver;
        pendingEnterResolver = undefined;
        resolvePendingEnter?.();

        activeCaptureCount = 0;
        stopOutputCapture();
        state.flushOutput();
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
            activeCaptureCount++;
        },
        stopCapturingAgentOutput(): void {
            activeCaptureCount = Math.max(0, activeCaptureCount - 1);
            if (activeCaptureCount === 0) state.flushOutput();
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
