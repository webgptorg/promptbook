import colors from 'colors';
import type { CoderRunPauseState } from '../common/waitForPause';
import type { CoderRunConfig, CoderRunPhase, CoderRunProgressSnapshot } from './CoderRunUiState';
import { buildCoderRunOctopusVisual } from './buildCoderRunOctopusVisual';
import { fitAnsiText, fitPlainText, padAnsiText, stripAnsi } from './coderRunUiText';
import { isCoderRunUiAutoRefreshing } from './coderRunUiRefresh';

/**
 * Maximum number of output lines reserved for agent output in the UI.
 */
const MAX_VISIBLE_OUTPUT_LINES = 8;

/**
 * Minimum width used for the rich coder-run frame.
 */
const MIN_FRAME_WIDTH = 56;

/**
 * Maximum width used for the rich coder-run frame.
 */
const MAX_FRAME_WIDTH = 96;

/**
 * Visible width reserved for aligned labels in the session box.
 */
const SESSION_LABEL_WIDTH = 8;

/**
 * One structured row rendered inside the session box.
 */
type SessionRow = {
    readonly label: string;
    readonly value: string;
};

/**
 * Shared pause-state shape between the renderer and the frame builder.
 */
export type { CoderRunPauseState };

/**
 * Shared copy and colors derived from the current pause lifecycle state.
 */
type PausePresentation = {
    readonly badge: string;
    readonly stateMessage: string;
    readonly pauseControl: string;
};

/**
 * Snapshot consumed by the pure coder-run frame builder.
 */
export type BuildCoderRunUiFrameOptions = {
    readonly terminalWidth: number;
    readonly animationFrame: number;
    readonly spinner: string;
    readonly pauseState: CoderRunPauseState;
    readonly config: CoderRunConfig;
    readonly phase: CoderRunPhase;
    readonly currentPromptLabel: string;
    readonly currentAttempt: number;
    readonly maxAttempts: number;
    readonly statusMessage: string;
    readonly detailLines: readonly string[];
    readonly pendingEnterLabel?: string;
    readonly agentOutputLines: readonly string[];
    readonly errors: readonly string[];
    readonly progress: CoderRunProgressSnapshot;
};

/**
 * Builds the complete boxed terminal frame for the rich `ptbk coder run` UI.
 */
export function buildCoderRunUiFrame(options: BuildCoderRunUiFrameOptions): string[] {
    const totalWidth = Math.max(MIN_FRAME_WIDTH, Math.min(options.terminalWidth, MAX_FRAME_WIDTH));
    const isPromptActive = options.phase === 'running' || options.phase === 'verifying' || options.phase === 'loading';
    const promptStatusPrefix = isPromptActive ? `${colors.yellow(`${options.spinner} `)}` : '';
    const octopusAnimationFrame = isCoderRunUiAutoRefreshing(options.phase, options.pauseState)
        ? options.animationFrame
        : 0;
    const pausePresentation = buildPausePresentation(options.phase, options.pauseState, options.statusMessage);
    const sessionLines = buildSessionLines(options, totalWidth, pausePresentation);

    const currentTaskLines = options.currentPromptLabel
        ? [
              `${promptStatusPrefix}${colors.bold.white(fitPlainText(options.currentPromptLabel, totalWidth - 8))}`,
              `Attempt ${options.currentAttempt}/${options.maxAttempts}  ·  ${options.statusMessage}`,
              ...options.detailLines.map((detailLine) => `• ${detailLine}`),
          ]
        : [options.statusMessage, ...options.detailLines.map((detailLine) => `• ${detailLine}`)];

    const visibleOutputLines = buildVisibleOutputLines(options.agentOutputLines);

    const controls = buildControlPills(pausePresentation.pauseControl, options.pendingEnterLabel).join('  ');

    const frame = [
        ...buildCoderRunOctopusVisual({ totalWidth, animationFrame: octopusAnimationFrame }),
        '',
        ...renderBox('Session', sessionLines, totalWidth, colors.yellow.bold),
        ...renderBox(
            options.currentPromptLabel ? 'Current task' : 'Queue',
            currentTaskLines,
            totalWidth,
            colors.magenta.bold,
        ),
        ...renderBox('Live output', visibleOutputLines, totalWidth, colors.green.bold),
    ];

    if (options.errors.length > 0) {
        frame.push(
            ...renderBox(
                'Errors',
                options.errors.map((errorLine) => `${colors.red('✗')} ${errorLine}`),
                totalWidth,
                colors.red.bold,
            ),
        );
    }

    frame.push(...renderBox('Controls', [controls], totalWidth, colors.white.bold));
    return frame;
}

/**
 * Builds the structured session lines that combine state, runner, queue, and timing metadata.
 */
function buildSessionLines(
    options: BuildCoderRunUiFrameOptions,
    totalWidth: number,
    pausePresentation: PausePresentation,
): readonly string[] {
    const bodyWidth = Math.max(10, totalWidth - 4);
    return buildSessionRows(options, bodyWidth, pausePresentation).map((sessionRow) =>
        buildLabeledSessionLine(sessionRow.label, sessionRow.value, bodyWidth),
    );
}

/**
 * Builds the session rows so the renderer can keep one consistent structure without duplicating labels.
 */
function buildSessionRows(
    options: BuildCoderRunUiFrameOptions,
    bodyWidth: number,
    pausePresentation: PausePresentation,
): readonly SessionRow[] {
    const runnerParts = [options.config.agentName || 'No agent selected'];

    if (options.config.modelName) {
        runnerParts.push(options.config.modelName);
    }
    if (options.config.thinkingLevel) {
        runnerParts.push(`thinking ${options.config.thinkingLevel}`);
    }

    const configurationRows = [
        ...buildOptionalSessionRow('Context', options.config.context),
        ...buildOptionalSessionRow('Test', options.config.testCommand),
    ];

    return [
        {
            label: 'State',
            value: `${pausePresentation.badge} ${pausePresentation.stateMessage}`,
        },
        {
            label: 'Runner',
            value: runnerParts.join('  ·  '),
        },
        ...configurationRows,
        {
            label: 'This run',
            value: buildThisRunSummary(options.progress),
        },
        {
            label: 'Backlog',
            value: buildBacklogSummary(options.progress),
        },
        {
            label: 'Scope',
            value: buildScopeSummary(options.progress, options.config),
        },
        {
            label: 'Timing',
            value: buildTimingSummary(options.progress),
        },
        {
            label: 'Progress',
            value: buildProgressBar(
                options.progress.percentage,
                bodyWidth - SESSION_LABEL_WIDTH - 1,
                `${options.progress.percentage}% complete (${options.progress.sessionDone}/${options.progress.sessionTotal} done)`,
            ),
        },
    ];
}

/**
 * Builds the fixed-height live output section so streaming updates do not keep resizing the frame.
 */
function buildVisibleOutputLines(agentOutputLines: readonly string[]): readonly string[] {
    const visibleOutputLines =
        agentOutputLines.length > 0
            ? agentOutputLines.slice(-MAX_VISIBLE_OUTPUT_LINES).map((line) => `› ${stripAnsi(line)}`)
            : ['No live agent output yet.'];

    while (visibleOutputLines.length < MAX_VISIBLE_OUTPUT_LINES) {
        visibleOutputLines.push('');
    }

    return visibleOutputLines;
}

/**
 * Renders a framed box with a colored title and padded body lines.
 */
function renderBox(
    title: string,
    lines: readonly string[],
    totalWidth: number,
    colorizeTitle: (text: string) => string,
): string[] {
    const bodyWidth = Math.max(10, totalWidth - 4);
    const titleText = ` ${title} `;
    const topBorder =
        colors.gray('┌') +
        colorizeTitle(titleText) +
        colors.gray('─'.repeat(Math.max(0, totalWidth - 2 - titleText.length)) + '┐');
    const body = lines.map((line) => {
        const paddedLine = padAnsiText(line, bodyWidth);
        return colors.gray('│ ') + paddedLine + colors.gray(' │');
    });
    const bottomBorder = colors.gray(`└${'─'.repeat(totalWidth - 2)}┘`);

    return [topBorder, ...body, bottomBorder];
}

/**
 * Builds one aligned labeled line inside the session box.
 */
function buildLabeledSessionLine(label: string, value: string, bodyWidth: number): string {
    const formattedLabel = colors.gray(label.padEnd(SESSION_LABEL_WIDTH));
    return `${formattedLabel} ${fitAnsiText(value, bodyWidth - SESSION_LABEL_WIDTH - 1)}`;
}

/**
 * Builds zero or one structured session row for optional metadata.
 */
function buildOptionalSessionRow(label: string, value: string | undefined): readonly SessionRow[] {
    if (!value) {
        return [];
    }

    return [{ label, value }];
}

/**
 * Builds the active-session summary shown in the session box.
 */
function buildThisRunSummary(progress: CoderRunProgressSnapshot): string {
    if (progress.sessionTotal === 0) {
        return 'No runnable prompts in current scope';
    }

    return `Task ${progress.currentPromptIndex}/${progress.sessionTotal}  ·  ${progress.sessionDone} done  ·  ${progress.sessionRemaining} left`;
}

/**
 * Builds the backlog/filter summary shown in the session box.
 */
function buildBacklogSummary(progress: CoderRunProgressSnapshot): string {
    const parts = [`Repo ${progress.totalPrompts} total`];

    if (progress.skippedPrompts > 0) {
        parts.push(`${formatPromptCount(progress.skippedPrompts)} below priority`);
    }

    return parts.join('  ·  ');
}

/**
 * Builds the priority/write-order summary shown in the session box.
 */
function buildScopeSummary(progress: CoderRunProgressSnapshot, config: CoderRunConfig): string {
    const parts = [`Priority ≥${config.priority}`];

    if (progress.toBeWrittenPrompts > 0) {
        parts.push(`Write ${formatPromptCount(progress.toBeWrittenPrompts)} first`);
    }

    return parts.join('  ·  ');
}

/**
 * Builds the elapsed/estimate summary shown in the session box.
 */
function buildTimingSummary(progress: CoderRunProgressSnapshot): string {
    return `Elapsed ${progress.elapsedText}  ·  Total ${progress.estimatedTotalText}  ·  ETA ${progress.estimatedLabel}`;
}

/**
 * Builds the colored phase badge shown in the session box.
 */
function buildPausePresentation(
    phase: CoderRunPhase,
    pauseState: CoderRunPauseState,
    statusMessage: string,
): PausePresentation {
    if (pauseState === 'PAUSING') {
        return {
            badge: colors.bgYellow.black(' PAUSING '),
            stateMessage: 'Pausing before the next task',
            pauseControl: colors.bgMagenta.white(' P ') + colors.white(' Cancel pause'),
        };
    }

    if (pauseState === 'PAUSED') {
        return {
            badge: colors.bgWhite.black(' PAUSED '),
            stateMessage: 'Paused until resumed',
            pauseControl: colors.bgGreen.black(' P ') + colors.white(' Resume'),
        };
    }

    return {
        badge: buildRunningPhaseBadge(phase),
        stateMessage: statusMessage,
        pauseControl: colors.bgYellow.black(' P ') + colors.white(' Pause'),
    };
}

/**
 * Builds the active phase badge shown in the session box while the runner is not paused.
 */
function buildRunningPhaseBadge(phase: CoderRunPhase): string {
    switch (phase) {
        case 'loading':
        case 'initializing':
            return colors.bgCyan.black(' LOADING ');
        case 'running':
            return colors.bgGreen.black(' RUNNING ');
        case 'verifying':
            return colors.bgMagenta.white(' VERIFYING ');
        case 'waiting':
            return colors.bgBlue.white(' WAITING ');
        case 'done':
            return colors.bgGreen.black(' DONE ');
        case 'error':
            return colors.bgRed.white(' ERROR ');
        case 'paused':
            return colors.bgWhite.black(' READY ');
        default:
            return colors.bgWhite.black(' READY ');
    }
}

/**
 * Builds the progress bar shown in the session box.
 */
function buildProgressBar(percentage: number, availableWidth: number, label: string): string {
    const percentageLabel = label;
    const barWidth = Math.max(10, availableWidth - percentageLabel.length - 1);
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = Math.max(0, barWidth - filledWidth);

    return `${colors.green('█'.repeat(filledWidth))}${colors.blue('░'.repeat(emptyWidth))} ${percentageLabel}`;
}

/**
 * Formats a prompt count with singular/plural wording.
 */
function formatPromptCount(count: number): string {
    return `${count} prompt${count === 1 ? '' : 's'}`;
}

/**
 * Builds the control pills shown in the footer box.
 */
function buildControlPills(pauseControl: string, pendingEnterLabel: string | undefined): readonly string[] {
    const pills: string[] = [];

    if (pendingEnterLabel) {
        pills.push(colors.bgWhite.black(' ENTER ') + colors.white(` ${pendingEnterLabel}`));
    }

    pills.push(pauseControl);
    pills.push(colors.bgRed.white(' CTRL+C ') + colors.white(' Exit'));

    return pills;
}
