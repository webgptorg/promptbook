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
 *
 * @private internal utility of coder run UI
 */
export function visibleLength(text: string): number {
    return stripAnsi(text).length;
}

/**
 * Strips ANSI escape codes from a string.
 *
 * @private internal utility of coder run UI
 */
export function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}
