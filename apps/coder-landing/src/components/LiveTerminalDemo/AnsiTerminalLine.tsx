import type { CSSProperties } from 'react';

/**
 * One rendered segment of an ANSI-colored terminal line.
 */
type AnsiTerminalSegment = {
    /**
     * Visible text of the segment.
     */
    readonly text: string;

    /**
     * Inline CSS translated from ANSI color escapes.
     */
    readonly style: CSSProperties;
};

/**
 * Props of `<AnsiTerminalLine/>`.
 */
type AnsiTerminalLineProps = {
    /**
     * Raw terminal line containing ANSI SGR escape codes.
     */
    readonly line: string;
};

/**
 * ANSI SGR sequence matcher.
 */
// eslint-disable-next-line no-control-regex
const ANSI_SGR_SEQUENCE_PATTERN = /\x1b\[([0-9;]*)m/g;

/**
 * Resets foreground and background terminal colors.
 */
const ANSI_RESET_CODE = 0;

/**
 * Enables bold terminal text.
 */
const ANSI_BOLD_CODE = 1;

/**
 * Resets bold terminal text.
 */
const ANSI_NORMAL_INTENSITY_CODE = 22;

/**
 * Starts a foreground color sequence.
 */
const ANSI_FOREGROUND_COLOR_CODE = 38;

/**
 * Resets foreground color.
 */
const ANSI_DEFAULT_FOREGROUND_CODE = 39;

/**
 * Starts a background color sequence.
 */
const ANSI_BACKGROUND_COLOR_CODE = 48;

/**
 * Resets background color.
 */
const ANSI_DEFAULT_BACKGROUND_CODE = 49;

/**
 * Marks a true-color RGB sequence.
 */
const ANSI_TRUE_COLOR_MODE_CODE = 2;

/**
 * Number of numeric values in an ANSI true-color RGB sequence after the mode code.
 */
const ANSI_TRUE_COLOR_CHANNEL_COUNT = 3;

/**
 * Renders one ANSI-colored terminal line as browser text spans.
 */
export function AnsiTerminalLine({ line }: AnsiTerminalLineProps) {
    return (
        <>
            {parseAnsiTerminalLine(line).map((segment, segmentIndex) => (
                <span key={segmentIndex} style={segment.style}>
                    {segment.text}
                </span>
            ))}
        </>
    );
}

/**
 * Parses ANSI SGR colors into styled text segments.
 */
function parseAnsiTerminalLine(line: string): ReadonlyArray<AnsiTerminalSegment> {
    const segments: Array<AnsiTerminalSegment> = [];
    let currentStyle: CSSProperties = {};
    let lastIndex = 0;

    for (const match of line.matchAll(ANSI_SGR_SEQUENCE_PATTERN)) {
        const matchIndex = match.index || 0;
        appendSegment(segments, line.slice(lastIndex, matchIndex), currentStyle);
        currentStyle = applyAnsiCodes(currentStyle, parseAnsiCodes(match[1] || '0'));
        lastIndex = matchIndex + match[0].length;
    }

    appendSegment(segments, line.slice(lastIndex), currentStyle);
    return segments;
}

/**
 * Appends one non-empty text segment.
 */
function appendSegment(segments: Array<AnsiTerminalSegment>, text: string, style: CSSProperties): void {
    if (text === '') {
        return;
    }

    segments.push({
        text,
        style: { ...style },
    });
}

/**
 * Parses the numeric part of one ANSI SGR sequence.
 */
function parseAnsiCodes(rawCodes: string): ReadonlyArray<number> {
    return rawCodes
        .split(';')
        .map((rawCode) => Number.parseInt(rawCode, 10))
        .filter((code) => Number.isFinite(code));
}

/**
 * Applies ANSI SGR codes to the current browser style.
 */
function applyAnsiCodes(style: CSSProperties, codes: ReadonlyArray<number>): CSSProperties {
    const nextStyle: CSSProperties = { ...style };

    for (let codeIndex = 0; codeIndex < codes.length; codeIndex++) {
        const code = codes[codeIndex];

        if (code === ANSI_RESET_CODE) {
            delete nextStyle.color;
            delete nextStyle.backgroundColor;
            delete nextStyle.fontWeight;
            continue;
        }

        if (code === ANSI_BOLD_CODE) {
            nextStyle.fontWeight = 700;
            continue;
        }

        if (code === ANSI_NORMAL_INTENSITY_CODE) {
            delete nextStyle.fontWeight;
            continue;
        }

        if (code === ANSI_DEFAULT_FOREGROUND_CODE) {
            delete nextStyle.color;
            continue;
        }

        if (code === ANSI_DEFAULT_BACKGROUND_CODE) {
            delete nextStyle.backgroundColor;
            continue;
        }

        if (
            (code === ANSI_FOREGROUND_COLOR_CODE || code === ANSI_BACKGROUND_COLOR_CODE) &&
            codes[codeIndex + 1] === ANSI_TRUE_COLOR_MODE_CODE
        ) {
            const color = createRgbColor(codes.slice(codeIndex + 2, codeIndex + 2 + ANSI_TRUE_COLOR_CHANNEL_COUNT));

            if (code === ANSI_FOREGROUND_COLOR_CODE) {
                nextStyle.color = color;
            } else {
                nextStyle.backgroundColor = color;
            }

            codeIndex += ANSI_TRUE_COLOR_CHANNEL_COUNT + 1;
        }
    }

    return nextStyle;
}

/**
 * Builds one CSS RGB color from ANSI channel values.
 */
function createRgbColor(channels: ReadonlyArray<number>): string {
    const [red = 0, green = 0, blue = 0] = channels;
    return `rgb(${clampColorChannel(red)}, ${clampColorChannel(green)}, ${clampColorChannel(blue)})`;
}

/**
 * Keeps one color channel inside the CSS RGB range.
 */
function clampColorChannel(value: number): number {
    return Math.max(0, Math.min(255, value));
}
