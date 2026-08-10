/**
 * ANSI sequence that clears the current terminal row.
 *
 * @private internal constant of coder run UI
 */
const CLEAR_CURRENT_LINE = '\x1b[2K';

/**
 * ANSI control character that moves the cursor to the start of its current row.
 *
 * @private internal constant of coder run UI
 */
const MOVE_CURSOR_TO_LINE_START = '\r';

/**
 * Builds the terminal output required to replace the previous coder-run frame with the next one.
 *
 * The complete update is returned as one string so callers can write it atomically. This prevents
 * animated visuals from producing a separate terminal write for every changed row, which otherwise
 * leaves a large rendering backlog in terminal emulators while their window is not focused.
 *
 * @private internal utility of coder run UI
 */
export type BuildCoderRunUiTerminalFrameUpdateOptions = {
    /** Frame currently displayed in the terminal, with the cursor on its last row. */
    readonly previousFrameLines: readonly string[];

    /** Frame that should replace the currently displayed frame. */
    readonly nextFrameLines: readonly string[];
};

/**
 * Builds one atomic ANSI update that changes the displayed coder-run terminal frame.
 *
 * A change in frame height requires a full rewrite to reserve or clear rows correctly. Frames with
 * the same height only rewrite contiguous groups of changed rows, returning to the frame bottom
 * between groups so each group can be assembled into the same output payload safely.
 *
 * @returns One terminal output payload, or `undefined` when the frame is already up to date.
 *
 * @private internal utility of coder run UI
 */
export function buildCoderRunUiTerminalFrameUpdate(
    options: BuildCoderRunUiTerminalFrameUpdateOptions,
): string | undefined {
    const { previousFrameLines, nextFrameLines } = options;

    if (previousFrameLines.length === 0 && nextFrameLines.length === 0) {
        return undefined;
    }

    if (previousFrameLines.length === 0 || previousFrameLines.length !== nextFrameLines.length) {
        return buildFullCoderRunUiTerminalFrameUpdate(previousFrameLines, nextFrameLines);
    }

    return buildChangedCoderRunUiTerminalFrameUpdate(previousFrameLines, nextFrameLines);
}

/**
 * Builds an ANSI update which completely rewrites the reserved terminal frame area.
 *
 * @private helper of `buildCoderRunUiTerminalFrameUpdate`
 */
function buildFullCoderRunUiTerminalFrameUpdate(
    previousFrameLines: readonly string[],
    nextFrameLines: readonly string[],
): string {
    const previousFrameLineCount = previousFrameLines.length;
    const lineCountToRewrite = Math.max(previousFrameLineCount, nextFrameLines.length);
    const outputParts: string[] = [];

    if (previousFrameLineCount > 1) {
        outputParts.push(moveCursorUp(previousFrameLineCount - 1));
    }

    for (let lineIndex = 0; lineIndex < lineCountToRewrite; lineIndex++) {
        outputParts.push(CLEAR_CURRENT_LINE, MOVE_CURSOR_TO_LINE_START, nextFrameLines[lineIndex] ?? '');

        if (lineIndex < lineCountToRewrite - 1) {
            outputParts.push('\n');
        }
    }

    const clearedTrailingLineCount = lineCountToRewrite - nextFrameLines.length;
    if (clearedTrailingLineCount > 0) {
        outputParts.push(moveCursorUp(clearedTrailingLineCount));
    }

    outputParts.push(MOVE_CURSOR_TO_LINE_START);
    return outputParts.join('');
}

/**
 * Builds an ANSI update that rewrites only contiguous groups of rows which changed.
 *
 * @private helper of `buildCoderRunUiTerminalFrameUpdate`
 */
function buildChangedCoderRunUiTerminalFrameUpdate(
    previousFrameLines: readonly string[],
    nextFrameLines: readonly string[],
): string | undefined {
    const outputParts: string[] = [];
    let lineIndex = 0;

    while (lineIndex < nextFrameLines.length) {
        if (previousFrameLines[lineIndex] === nextFrameLines[lineIndex]) {
            lineIndex++;
            continue;
        }

        const changedRangeStartLineIndex = lineIndex;
        while (
            lineIndex + 1 < nextFrameLines.length &&
            previousFrameLines[lineIndex + 1] !== nextFrameLines[lineIndex + 1]
        ) {
            lineIndex++;
        }

        appendChangedCoderRunUiTerminalFrameRange({
            outputParts,
            frameLineCount: nextFrameLines.length,
            changedRangeStartLineIndex,
            changedRangeEndLineIndex: lineIndex,
            nextFrameLines,
        });
        lineIndex++;
    }

    return outputParts.length === 0 ? undefined : outputParts.join('');
}

/**
 * Appends the cursor movements and row rewrites for one contiguous changed frame range.
 *
 * @private helper of `buildChangedCoderRunUiTerminalFrameUpdate`
 */
function appendChangedCoderRunUiTerminalFrameRange(options: {
    readonly outputParts: string[];
    readonly frameLineCount: number;
    readonly changedRangeStartLineIndex: number;
    readonly changedRangeEndLineIndex: number;
    readonly nextFrameLines: readonly string[];
}): void {
    const { outputParts, frameLineCount, changedRangeStartLineIndex, changedRangeEndLineIndex, nextFrameLines } =
        options;
    const linesUpFromFrameBottom = frameLineCount - 1 - changedRangeStartLineIndex;

    if (linesUpFromFrameBottom > 0) {
        outputParts.push(moveCursorUp(linesUpFromFrameBottom));
    }

    for (let lineIndex = changedRangeStartLineIndex; lineIndex <= changedRangeEndLineIndex; lineIndex++) {
        outputParts.push(CLEAR_CURRENT_LINE, MOVE_CURSOR_TO_LINE_START, nextFrameLines[lineIndex]!);

        if (lineIndex < changedRangeEndLineIndex) {
            outputParts.push('\n');
        }
    }

    const linesDownToFrameBottom = frameLineCount - 1 - changedRangeEndLineIndex;
    if (linesDownToFrameBottom > 0) {
        outputParts.push(moveCursorDown(linesDownToFrameBottom));
    }

    outputParts.push(MOVE_CURSOR_TO_LINE_START);
}

/**
 * Builds an ANSI sequence which moves the terminal cursor up by a positive number of rows.
 *
 * @private helper of `buildCoderRunUiTerminalFrameUpdate`
 */
function moveCursorUp(lineCount: number): string {
    return `\x1b[${lineCount}A`;
}

/**
 * Builds an ANSI sequence which moves the terminal cursor down by a positive number of rows.
 *
 * @private helper of `buildCoderRunUiTerminalFrameUpdate`
 */
function moveCursorDown(lineCount: number): string {
    return `\x1b[${lineCount}B`;
}
