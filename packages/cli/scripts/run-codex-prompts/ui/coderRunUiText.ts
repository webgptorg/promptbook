import stringWidth from 'string-width';

/** Reused for grapheme-safe clipping and wrapping on supported Node versions. */
const TERMINAL_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Centers an ANSI-colored line within the available frame width.
 *
 * @private internal utility of coder run UI
 */
export function centerAnsiText(text: string, width: number): string {
    const paddingWidth = Math.max(0, Math.floor((width - visibleLength(text)) / 2));
    return `${' '.repeat(paddingWidth)}${text}`;
}

/**
 * Pads or truncates a possibly ANSI-colored line to the target visible width.
 *
 * @private internal utility of coder run UI
 */
export function padAnsiText(text: string, width: number): string {
    const fittedText = fitAnsiText(text, width);
    return fittedText + ' '.repeat(Math.max(0, width - visibleLength(fittedText)));
}

/**
 * Truncates a possibly ANSI-colored line to the target visible width.
 *
 * @private internal utility of coder run UI
 */
export function fitAnsiText(text: string, width: number): string {
    if (visibleLength(text) <= width) {
        return text;
    }

    return fitPlainText(stripAnsi(text), width);
}

/**
 * Truncates a plain-text line to the target width with an ellipsis.
 *
 * @private internal utility of coder run UI
 */
export function fitPlainText(text: string, width: number): string {
    width = Math.max(0, width);
    if (visibleLength(text) <= width) {
        return text;
    }

    if (width <= 3) {
        return '.'.repeat(width);
    }

    let fittedText = '';
    let fittedWidth = 0;
    for (const { segment } of TERMINAL_SEGMENTER.segment(text)) {
        const segmentWidth = stringWidth(segment);
        if (fittedWidth + segmentWidth > width - 3) break;
        fittedText += segment;
        fittedWidth += segmentWidth;
    }
    return `${fittedText}...`;
}

/**
 * Measures visible string width by stripping ANSI escape codes.
 *
 * @private internal utility of coder run UI
 */
export function visibleLength(text: string): number {
    return stringWidth(stripAnsi(text));
}

/** Wraps sanitized display text without splitting surrogate pairs, combining marks or emoji sequences. */
export function wrapTerminalText(text: string, width: number): string[] {
    const lines: string[] = [];
    width = Math.max(1, width);
    for (const line of sanitizeTerminalText(text).split('\n')) {
        // Most protocol and command lines are ASCII. Avoid per-character segmentation of large raw records.
        if (/^[\x20-\x7e]*$/.test(line)) {
            for (let offset = 0; offset < line.length; offset += width) lines.push(line.slice(offset, offset + width));
            if (!line) lines.push('');
            continue;
        }
        let current = '';
        let currentWidth = 0;
        for (const { segment } of TERMINAL_SEGMENTER.segment(line)) {
            const segmentWidth = stringWidth(segment);
            if (current && currentWidth + segmentWidth > width) {
                lines.push(current);
                current = '';
                currentWidth = 0;
            }
            current += segmentWidth > width ? '?' : segment;
            currentWidth += Math.min(segmentWidth, width);
        }
        lines.push(current);
    }
    return lines;
}

/** Harness control characters may be retained in logs but cannot move the dashboard cursor. */
export function sanitizeTerminalText(text: string): string {
    // eslint-disable-next-line no-control-regex
    return stripAnsi(text)
        .replace(/\r\n?/g, '\n')
        .replace(/\t/g, '    ')
        .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}

/**
 * Strips ANSI escape codes from a string.
 *
 * @private internal utility of coder run UI
 */
export function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}
