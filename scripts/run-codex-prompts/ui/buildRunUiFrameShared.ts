import colors from 'colors';
import { isAbsolute, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import type { CoderRunPauseState } from '../common/waitForPause';
import type { CoderRunPhase } from './CoderRunUiState';
import { fitAnsiText, fitPlainText, padAnsiText, stripAnsi } from './coderRunUiText';

/**
 * Maximum number of output lines reserved for agent output in the UI.
 */
export const MAX_VISIBLE_OUTPUT_LINES = 8;

/**
 * Visible width reserved for aligned labels in the session box.
 */
export const SESSION_LABEL_WIDTH = 8;

/**
 * Maximum number of temporary shell script paths rendered in the session box.
 */
const MAX_SCRIPT_SESSION_ROWS = 3;

/**
 * One structured row rendered inside the session box.
 */
export type SessionRow = {
    readonly label: string;
    readonly value: string;
};

/**
 * Shared copy and colors derived from the current pause lifecycle state.
 */
export type PausePresentation = {
    readonly badge: string;
    readonly stateMessage: string;
    readonly pauseControl: string;
};

/**
 * Builds the fixed-height live output section so streaming updates do not keep resizing the frame.
 */
export function buildVisibleOutputLines(agentOutputLines: readonly string[]): readonly string[] {
    const visibleOutputLines =
        agentOutputLines.length > 0
            ? agentOutputLines.slice(-MAX_VISIBLE_OUTPUT_LINES).map((line) => `› ${stripAnsi(line)}`)
            : [colors.gray('No live agent output yet.')];

    while (visibleOutputLines.length < MAX_VISIBLE_OUTPUT_LINES) {
        visibleOutputLines.push('');
    }

    return visibleOutputLines;
}

/**
 * Renders a framed box with a colored title and padded body lines.
 */
export function renderBox(
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
export function buildLabeledSessionLine(label: string, value: string, bodyWidth: number): string {
    const formattedLabel = colors.gray(label.padEnd(SESSION_LABEL_WIDTH));
    return `${formattedLabel} ${fitAnsiText(value, bodyWidth - SESSION_LABEL_WIDTH - 1)}`;
}

/**
 * Builds session rows with clickable links to active temporary runner shell scripts.
 */
export function buildScriptPathSessionRows(scriptPaths: readonly string[], bodyWidth: number): readonly SessionRow[] {
    const uniqueScriptPaths = [...new Set(scriptPaths.map((scriptPath) => scriptPath.trim()).filter(Boolean))];

    if (uniqueScriptPaths.length === 0) {
        return [];
    }

    const availableValueWidth = Math.max(10, bodyWidth - SESSION_LABEL_WIDTH - 1);
    const visibleScriptPaths = uniqueScriptPaths.slice(0, MAX_SCRIPT_SESSION_ROWS);
    const scriptRows = visibleScriptPaths.map((scriptPath, index) => ({
        label: index === 0 ? (uniqueScriptPaths.length === 1 ? 'Script' : 'Scripts') : '',
        value: buildTerminalFileLink(scriptPath, availableValueWidth),
    }));

    if (uniqueScriptPaths.length <= MAX_SCRIPT_SESSION_ROWS) {
        return scriptRows;
    }

    return [
        ...scriptRows,
        {
            label: '',
            value: colors.gray(`...and ${uniqueScriptPaths.length - MAX_SCRIPT_SESSION_ROWS} more scripts`),
        },
    ];
}

/**
 * Builds the colored phase badge shown in the session box.
 */
export function buildPausePresentation(
    phase: CoderRunPhase,
    pauseState: CoderRunPauseState,
    pauseTargetLabel: string,
    statusMessage: string,
): PausePresentation {
    if (pauseState === 'PAUSING') {
        return {
            badge: colors.bgYellow.black(' PAUSING '),
            stateMessage: `Pausing before ${pauseTargetLabel}`,
            pauseControl: colors.bgMagenta.white(' P ') + colors.white(' Cancel pause'),
        };
    }

    if (pauseState === 'PAUSED') {
        return {
            badge: colors.bgWhite.black(' PAUSED '),
            stateMessage: `Paused before ${pauseTargetLabel}`,
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
 * Builds the progress bar shown in the session box.
 */
export function buildProgressBar(percentage: number, availableWidth: number, label: string): string {
    const percentageLabel = label;
    const barWidth = Math.max(10, availableWidth - percentageLabel.length - 1);
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = Math.max(0, barWidth - filledWidth);

    return `${colors.green('█'.repeat(filledWidth))}${colors.blue('░'.repeat(emptyWidth))} ${percentageLabel}`;
}

/**
 * Builds the control pills shown in the footer box.
 */
export function buildControlPills(pauseControl: string, pendingEnterLabel: string | undefined): readonly string[] {
    const pills: string[] = [];

    if (pendingEnterLabel) {
        pills.push(colors.bgWhite.black(' ENTER ') + colors.white(` ${pendingEnterLabel}`));
    }

    pills.push(pauseControl);
    pills.push(colors.bgRed.white(' CTRL+C ') + colors.white(' Exit'));

    return pills;
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
 * Builds one OSC 8 terminal hyperlink to a local file.
 */
function buildTerminalFileLink(scriptPath: string, availableWidth: number): string {
    const absoluteScriptPath = resolve(scriptPath);
    const displayPath = fitPlainText(formatScriptPathForDisplay(absoluteScriptPath), availableWidth);
    const fileUrl = pathToFileURL(absoluteScriptPath).href;
    return `\u001B]8;;${fileUrl}\u0007${displayPath}\u001B]8;;\u0007`;
}

/**
 * Formats paths relative to the current project when possible so the Session box stays readable.
 */
function formatScriptPathForDisplay(scriptPath: string): string {
    const relativeScriptPath = relative(process.cwd(), scriptPath).replace(/\\/gu, '/');

    if (relativeScriptPath && !relativeScriptPath.startsWith('..') && !isAbsolute(relativeScriptPath)) {
        return relativeScriptPath;
    }

    return scriptPath.replace(/\\/gu, '/');
}
