/**
 * ANSI Select Graphic Rendition sequences emitted by the shared terminal avatar renderer.
 */
// eslint-disable-next-line no-control-regex -- ANSI escape characters are intentional terminal output.
const ANSI_SELECT_GRAPHIC_RENDITION_PATTERN = /\u001b\[([0-9;]*)m/gu;

/**
 * ANSI parameter which resets all terminal text presentation.
 */
const ANSI_RESET_PARAMETER = 0;

/**
 * ANSI parameter which restores the terminal default foreground color.
 */
const ANSI_DEFAULT_FOREGROUND_PARAMETER = 39;

/**
 * ANSI parameter which begins an extended foreground-color sequence.
 */
const ANSI_FOREGROUND_COLOR_PARAMETER = 38;

/**
 * ANSI extended-color mode which encodes red, green, and blue channels directly.
 */
const ANSI_TRUE_COLOR_PARAMETER = 2;

/**
 * One plain-text segment of an ANSI terminal line, optionally carrying its foreground color.
 */
type AnsiTextSegment = {
    /**
     * Text content emitted by the terminal renderer.
     */
    readonly text: string;

    /**
     * CSS foreground color resolved from a terminal ANSI sequence.
     */
    readonly foregroundColor?: string;
};

/**
 * Renders one ANSI-colored terminal line as safe browser text spans.
 *
 * The shared coder renderer produces the visual as terminal ANSI text. This component only adapts those
 * foreground-color control sequences for the browser; it does not generate or redraw the avatar itself.
 */
export function TerminalAnsiTextLine({ line }: { readonly line: string }) {
    return parseAnsiTextSegments(line).map((textSegment, textSegmentIndex) => (
        <span
            key={textSegmentIndex}
            style={textSegment.foregroundColor ? { color: textSegment.foregroundColor } : undefined}
        >
            {textSegment.text}
        </span>
    ));
}

/**
 * Splits one ANSI terminal line into browser-renderable text segments.
 */
function parseAnsiTextSegments(line: string): ReadonlyArray<AnsiTextSegment> {
    const textSegments: Array<AnsiTextSegment> = [];
    let foregroundColor: string | undefined;
    let previousSequenceEndIndex = 0;

    for (const ansiSequenceMatch of line.matchAll(ANSI_SELECT_GRAPHIC_RENDITION_PATTERN)) {
        const ansiSequenceStartIndex = ansiSequenceMatch.index;

        if (ansiSequenceStartIndex === undefined) {
            continue;
        }

        appendAnsiTextSegment(
            textSegments,
            line.slice(previousSequenceEndIndex, ansiSequenceStartIndex),
            foregroundColor,
        );

        foregroundColor = resolveAnsiForegroundColor(ansiSequenceMatch[1] || '', foregroundColor);
        previousSequenceEndIndex = ansiSequenceStartIndex + ansiSequenceMatch[0].length;
    }

    appendAnsiTextSegment(textSegments, line.slice(previousSequenceEndIndex), foregroundColor);
    return textSegments;
}

/**
 * Appends a non-empty text segment while preserving its active foreground color.
 */
function appendAnsiTextSegment(
    textSegments: Array<AnsiTextSegment>,
    text: string,
    foregroundColor: string | undefined,
): void {
    if (text === '') {
        return;
    }

    textSegments.push({ text, foregroundColor });
}

/**
 * Resolves the active browser foreground color after one ANSI Select Graphic Rendition sequence.
 */
function resolveAnsiForegroundColor(
    ansiParametersText: string,
    previousForegroundColor: string | undefined,
): string | undefined {
    const ansiParameters =
        ansiParametersText === '' ? [ANSI_RESET_PARAMETER] : ansiParametersText.split(';').map(Number);
    let foregroundColor = previousForegroundColor;

    for (let ansiParameterIndex = 0; ansiParameterIndex < ansiParameters.length; ansiParameterIndex++) {
        const ansiParameter = ansiParameters[ansiParameterIndex];

        if (ansiParameter === ANSI_RESET_PARAMETER || ansiParameter === ANSI_DEFAULT_FOREGROUND_PARAMETER) {
            foregroundColor = undefined;
            continue;
        }

        if (
            ansiParameter === ANSI_FOREGROUND_COLOR_PARAMETER &&
            ansiParameters[ansiParameterIndex + 1] === ANSI_TRUE_COLOR_PARAMETER
        ) {
            const redColorChannel = ansiParameters[ansiParameterIndex + 2];
            const greenColorChannel = ansiParameters[ansiParameterIndex + 3];
            const blueColorChannel = ansiParameters[ansiParameterIndex + 4];

            if (
                isRgbColorChannel(redColorChannel) &&
                isRgbColorChannel(greenColorChannel) &&
                isRgbColorChannel(blueColorChannel)
            ) {
                foregroundColor = `rgb(${redColorChannel} ${greenColorChannel} ${blueColorChannel})`;
            }

            ansiParameterIndex += 4;
        }
    }

    return foregroundColor;
}

/**
 * Determines whether one ANSI color channel is a valid RGB byte.
 */
function isRgbColorChannel(value: number | undefined): value is number {
    return value !== undefined && Number.isInteger(value) && value >= 0 && value <= 255;
}
