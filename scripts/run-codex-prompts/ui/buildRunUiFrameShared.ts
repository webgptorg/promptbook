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
 * Matches runner errors that include the local shell script path passed to bash.
 */
const BASH_COMMAND_FILE_PATH_PATTERN = /Command\s+"bash\s+([^"\r\n]+)"/gu;

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
 * Builds error box lines and expands detected local files into wrapped clickable path rows.
 */
export function buildErrorDisplayLines(errorMessages: readonly string[], bodyWidth: number): readonly string[] {
    return errorMessages.flatMap((errorMessage) => [
        `${colors.red('✗')} ${stripAnsi(errorMessage)}`,
        ...buildErrorFilePathLines(errorMessage, bodyWidth),
    ]);
}

/**
 * Builds one OSC 8 terminal hyperlink to an HTTP URL.
 */
export function buildTerminalUrlLink(url: string, availableWidth: number): string {
    const displayUrl = fitPlainText(url, availableWidth);
    return `\u001B]8;;${url}\u0007${displayUrl}\u001B]8;;\u0007`;
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
function buildTerminalFileLink(filePath: string, availableWidth: number, displayPath?: string): string {
    const absoluteFilePath = resolveShellFilePath(filePath);
    const linkDisplayPath = fitPlainText(
        displayPath ?? formatProjectFilePathForDisplay(absoluteFilePath),
        availableWidth,
    );
    const fileUrl = pathToFileURL(absoluteFilePath).href;
    return `\u001B]8;;${fileUrl}\u0007${linkDisplayPath}\u001B]8;;\u0007`;
}

/**
 * Formats paths relative to the current project when possible so the Session box stays readable.
 */
function formatProjectFilePathForDisplay(filePath: string): string {
    const relativeFilePath = relative(process.cwd(), filePath).replace(/\\/gu, '/');

    if (relativeFilePath && !relativeFilePath.startsWith('..') && !isAbsolute(relativeFilePath)) {
        return relativeFilePath;
    }

    return formatFullFilePathForDisplay(filePath);
}

/**
 * Builds wrapped file path rows for known local files referenced by an error.
 */
function buildErrorFilePathLines(errorMessage: string, bodyWidth: number): readonly string[] {
    const filePaths = extractErrorFilePaths(errorMessage);

    if (filePaths.length === 0) {
        return [];
    }

    const availableValueWidth = Math.max(10, bodyWidth - SESSION_LABEL_WIDTH - 1);
    return filePaths.flatMap((filePath) => {
        const absoluteFilePath = resolveShellFilePath(filePath);
        const displayPathChunks = splitFilePathForDisplay(
            formatFullFilePathForDisplay(absoluteFilePath),
            availableValueWidth,
        );

        return displayPathChunks.map((displayPathChunk, index) =>
            buildLabeledSessionLine(
                index === 0 ? 'File' : '',
                buildTerminalFileLink(absoluteFilePath, availableValueWidth, displayPathChunk),
                bodyWidth,
            ),
        );
    });
}

/**
 * Extracts local file paths from known runner error formats.
 */
function extractErrorFilePaths(errorMessage: string): readonly string[] {
    const filePaths = new Set<string>();

    for (const match of errorMessage.matchAll(BASH_COMMAND_FILE_PATH_PATTERN)) {
        const filePath = match[1]?.trim();

        if (filePath) {
            filePaths.add(filePath);
        }
    }

    return [...filePaths];
}

/**
 * Resolves shell-formatted paths back to local filesystem paths for terminal hyperlinks.
 */
function resolveShellFilePath(filePath: string): string {
    const trimmedFilePath = filePath.trim();
    const windowsFilePath = convertMingwFilePathToWindowsPath(trimmedFilePath);
    return resolve(windowsFilePath);
}

/**
 * Converts `/c/...` paths used by Git Bash/MSYS on Windows back to `C:\...`.
 */
function convertMingwFilePathToWindowsPath(filePath: string): string {
    if (process.platform !== 'win32') {
        return filePath;
    }

    const match = filePath.match(/^\/([a-zA-Z])\/(.*)$/u);

    if (!match) {
        return filePath;
    }

    return `${match[1]!.toUpperCase()}:\\${match[2]!.replace(/\//gu, '\\')}`;
}

/**
 * Formats an absolute file path for full-path display in the terminal.
 */
function formatFullFilePathForDisplay(filePath: string): string {
    return filePath.replace(/\\/gu, '/');
}

/**
 * Splits a file path into terminal-width chunks while preferring directory boundaries.
 */
function splitFilePathForDisplay(filePath: string, availableWidth: number): readonly string[] {
    if (filePath.length <= availableWidth) {
        return [filePath];
    }

    const chunks: string[] = [];
    let remainingFilePath = filePath;

    while (remainingFilePath.length > availableWidth) {
        let splitIndex = remainingFilePath.lastIndexOf('/', availableWidth);

        if (splitIndex <= 0) {
            splitIndex = availableWidth;
        } else {
            splitIndex += 1;
        }

        chunks.push(remainingFilePath.slice(0, splitIndex));
        remainingFilePath = remainingFilePath.slice(splitIndex);
    }

    if (remainingFilePath) {
        chunks.push(remainingFilePath);
    }

    return chunks;
}
