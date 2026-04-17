import colors from 'colors';
import type { CoderRunConfig, CoderRunPhase, CoderRunProgressSnapshot } from './CoderRunUiState';

/**
 * Maximum number of output lines reserved for agent output in the UI.
 */
const MAX_VISIBLE_OUTPUT_LINES = 8;

/**
 * Shared pause-state shape between the renderer and the frame builder.
 */
export type CoderRunPauseState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * Snapshot consumed by the pure coder-run frame builder.
 */
export type BuildCoderRunUiFrameOptions = {
    readonly terminalWidth: number;
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
    const totalWidth = Math.max(56, Math.min(options.terminalWidth, 96));
    const isPromptActive =
        options.phase === 'running' || options.phase === 'verifying' || options.phase === 'loading';
    const promptStatusPrefix = isPromptActive ? `${colors.yellow(`${options.spinner} `)}` : '';
    const sessionScopeLine =
        options.progress.sessionTotal > 0
            ? `Working on ${options.progress.currentPromptIndex}/${options.progress.sessionTotal} prompts with Priority ≥${options.config.priority}`
            : `No runnable prompts with Priority ≥${options.config.priority}`;
    const sessionCountLine = `Done ${options.progress.sessionDone}/${options.progress.sessionTotal} this run  ·  Repo total ${options.progress.totalPrompts}`;
    const sessionQueueParts: string[] = [];

    if (options.progress.skippedPrompts > 0) {
        sessionQueueParts.push(`Skipping ${formatPromptCount(options.progress.skippedPrompts)} with Priority <${options.config.priority}`);
    }
    if (options.progress.toBeWrittenPrompts > 0) {
        sessionQueueParts.push(`Write first ${formatPromptCount(options.progress.toBeWrittenPrompts)}`);
    }

    const sessionLines = [
        `${buildPhaseBadge(options.phase, options.pauseState)} ${fitPlainText(options.statusMessage, totalWidth - 18)}`,
        sessionScopeLine,
        sessionCountLine,
        ...(sessionQueueParts.length > 0 ? [sessionQueueParts.join('  ·  ')] : []),
        `Elapsed ${options.progress.elapsedText}  ·  Est. total ${options.progress.estimatedTotalText}  ·  Est. done ${options.progress.estimatedLabel}`,
        buildProgressBar(
            options.progress.percentage,
            totalWidth - 6,
            `${options.progress.percentage}% complete (${options.progress.sessionDone}/${options.progress.sessionTotal} done)`,
        ),
    ];

    const metadataParts = [options.config.agentName || 'No agent selected'];
    if (options.config.modelName) {
        metadataParts.push(options.config.modelName);
    }
    if (options.config.thinkingLevel) {
        metadataParts.push(`thinking ${options.config.thinkingLevel}`);
    }

    const runnerDetails = [
        [`${colors.bgCyan.black(' PTBK ')}`, colors.bgBlue.white(' CODER '), colors.bold.white(' Promptbook Coder')]
            .join(''),
        metadataParts.join('  ·  '),
        buildConfigSummaryLine(options.config),
    ];

    const currentTaskLines = options.currentPromptLabel
        ? [
              `${promptStatusPrefix}${colors.bold.white(fitPlainText(options.currentPromptLabel, totalWidth - 8))}`,
              `Attempt ${options.currentAttempt}/${options.maxAttempts}  ·  ${options.statusMessage}`,
              ...options.detailLines.map((detailLine) => `• ${detailLine}`),
          ]
        : [options.statusMessage, ...options.detailLines.map((detailLine) => `• ${detailLine}`)];

    const visibleOutputLines =
        options.agentOutputLines.length > 0
            ? options.agentOutputLines.slice(-MAX_VISIBLE_OUTPUT_LINES).map((line) => `› ${stripAnsi(line)}`)
            : ['No live agent output yet.'];

    const controls = buildControlPills(options.pauseState, options.pendingEnterLabel).join('  ');

    const frame = [
        ...renderBox('Brand', runnerDetails, totalWidth, colors.cyan.bold),
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
 * Builds the compact config summary line shown in the branding box.
 */
function buildConfigSummaryLine(config: CoderRunConfig): string {
    const parts = [`Priority ≥${config.priority}`];

    if (config.context) {
        parts.unshift(`Context ${config.context}`);
    }
    if (config.testCommand) {
        parts.push(`Test ${config.testCommand}`);
    }

    return parts.join('  ·  ');
}

/**
 * Builds the colored phase badge shown in the session box.
 */
function buildPhaseBadge(phase: CoderRunPhase, pauseState: CoderRunPauseState): string {
    if (pauseState !== 'RUNNING' || phase === 'paused') {
        return colors.bgYellow.black(' PAUSED ');
    }

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

    return `${colors.green('█'.repeat(filledWidth))}${colors.gray('░'.repeat(emptyWidth))} ${percentageLabel}`;
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
function buildControlPills(
    pauseState: CoderRunPauseState,
    pendingEnterLabel: string | undefined,
): readonly string[] {
    const pills: string[] = [];

    if (pendingEnterLabel) {
        pills.push(colors.bgWhite.black(' ENTER ') + colors.white(` ${pendingEnterLabel}`));
    }

    pills.push(
        pauseState === 'RUNNING'
            ? colors.bgYellow.black(' P ') + colors.white(' Pause')
            : colors.bgYellow.black(' P ') + colors.white(' Resume'),
    );
    pills.push(colors.bgRed.white(' CTRL+C ') + colors.white(' Exit'));

    return pills;
}

/**
 * Pads or truncates a possibly ANSI-colored line to the target visible width.
 */
function padAnsiText(text: string, width: number): string {
    const fittedText = fitAnsiText(text, width);
    return fittedText + ' '.repeat(Math.max(0, width - visibleLength(fittedText)));
}

/**
 * Truncates a possibly ANSI-colored line to the target visible width.
 */
function fitAnsiText(text: string, width: number): string {
    if (visibleLength(text) <= width) {
        return text;
    }

    return fitPlainText(stripAnsi(text), width);
}

/**
 * Truncates a plain-text line to the target width with an ellipsis.
 */
function fitPlainText(text: string, width: number): string {
    if (text.length <= width) {
        return text;
    }

    if (width <= 3) {
        return '.'.repeat(width);
    }

    return `${text.slice(0, width - 3)}...`;
}

/**
 * Measures visible string width by stripping ANSI escape codes.
 */
function visibleLength(text: string): number {
    return stripAnsi(text).length;
}

/**
 * Strips ANSI escape codes from a string.
 */
function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
