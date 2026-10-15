/**
 * Matches ANSI escape sequences (CSI, OSC and single-character escapes).
 */
const ANSI_PATTERN = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

/**
 * Removes ANSI escape sequences.
 *
 * @private terminal UI
 */
export function stripAnsi(text: string): string {
    return text.replace(ANSI_PATTERN, '');
}

/**
 * Grapheme segmenter used for width computation.
 */
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * Whether a code point is rendered double-width (CJK, fullwidth forms, emoji presentation).
 */
function isWideCodePoint(codePoint: number): boolean {
    return (
        (codePoint >= 0x1100 && codePoint <= 0x115f) ||
        (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
        (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
        (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
        (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
        (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
        (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
        (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
        (codePoint >= 0xfe30 && codePoint <= 0xfe4f) ||
        (codePoint >= 0xff00 && codePoint <= 0xff60) ||
        (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
        (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
        (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
        (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) ||
        (codePoint >= 0x1fa70 && codePoint <= 0x1faff) ||
        (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    );
}

/**
 * Terminal column width of one grapheme.
 */
function graphemeWidth(grapheme: string): number {
    const codePoint = grapheme.codePointAt(0) ?? 0;
    if (codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) return 0;
    if (/^\p{Mark}+$/u.test(grapheme) || codePoint === 0x200b || codePoint === 0x200d) return 0;
    if (/\p{Emoji_Presentation}/u.test(grapheme) || grapheme.includes('️')) return 2;
    return isWideCodePoint(codePoint) ? 2 : 1;
}

/**
 * Visible terminal width of a text (ANSI sequences ignored).
 *
 * @private terminal UI
 */
export function stringWidth(text: string): number {
    let width = 0;
    for (const { segment } of segmenter.segment(stripAnsi(text))) width += graphemeWidth(segment);
    return width;
}

/**
 * Splits text into ANSI escape tokens and graphemes.
 */
function* tokens(text: string): Generator<{ ansi: boolean; value: string }> {
    let last = 0;
    for (const match of text.matchAll(ANSI_PATTERN)) {
        if (match.index! > last) for (const { segment } of segmenter.segment(text.slice(last, match.index))) yield { ansi: false, value: segment };
        yield { ansi: true, value: match[0] };
        last = match.index! + match[0].length;
    }
    if (last < text.length) for (const { segment } of segmenter.segment(text.slice(last))) yield { ansi: false, value: segment };
}

/**
 * Truncates text to a visible width, appending `…` when shortened (ANSI-aware).
 *
 * @private terminal UI
 */
export function truncate(text: string, width: number, ellipsis = '…'): string {
    if (width <= 0) return '';
    if (stringWidth(text) <= width) return text;
    const limit = width - stringWidth(ellipsis);
    let result = '';
    let used = 0;
    let styled = false;
    for (const token of tokens(text)) {
        if (token.ansi) {
            result += token.value;
            styled = true;
            continue;
        }
        const tokenWidth = graphemeWidth(token.value);
        if (used + tokenWidth > limit) break;
        result += token.value;
        used += tokenWidth;
    }
    return `${result}${ellipsis}${styled ? '\x1b[0m' : ''}`;
}

/**
 * Pads text with spaces to a visible width (truncating when longer).
 *
 * @private terminal UI
 */
export function fit(text: string, width: number): string {
    const truncated = truncate(text, width);
    return truncated + ' '.repeat(Math.max(0, width - stringWidth(truncated)));
}

/**
 * Word-wraps plain text to a width; long words are broken. Existing newlines are kept.
 *
 * @private terminal UI
 */
export function wrap(text: string, width: number): string[] {
    const lines: string[] = [];
    const limit = Math.max(1, width);
    for (const paragraph of text.split('\n')) {
        if (paragraph.trim() === '') {
            lines.push('');
            continue;
        }
        const indent = /^\s*/.exec(paragraph)![0];
        let current = '';
        for (const word of paragraph.trim().split(/\s+/)) {
            const candidate = current ? `${current} ${word}` : `${indent}${word}`;
            if (stringWidth(candidate) <= limit) {
                current = candidate;
                continue;
            }
            if (current) lines.push(current);
            let rest = `${indent}${word}`;
            while (stringWidth(rest) > limit) {
                const piece = truncate(rest, limit, '');
                lines.push(piece);
                rest = rest.slice(piece.length);
            }
            current = rest;
        }
        lines.push(current);
    }
    return lines;
}

/**
 * Semantic text styles for one output stream.
 *
 * @private terminal UI
 */
export type Style = {
    /** Whether escape sequences are emitted. */
    readonly enabled: boolean;
    readonly bold: (text: string) => string;
    readonly dim: (text: string) => string;
    readonly italic: (text: string) => string;
    readonly underline: (text: string) => string;
    readonly inverse: (text: string) => string;
    /** Primary brand/interactive accent. */
    readonly accent: (text: string) => string;
    readonly success: (text: string) => string;
    readonly warning: (text: string) => string;
    readonly error: (text: string) => string;
    readonly info: (text: string) => string;
    readonly muted: (text: string) => string;
    readonly magenta: (text: string) => string;
    /** Applies a 256-color foreground (identity colors). */
    readonly color256: (code: number, text: string) => string;
};

/**
 * Creates style functions; with `enabled = false` all functions return the text unchanged.
 *
 * @private terminal UI
 */
export function createStyle(enabled: boolean): Style {
    const wrapWith =
        (open: string, close: string) =>
        (text: string): string =>
            enabled && text ? `\x1b[${open}m${text}\x1b[${close}m` : text;
    return {
        enabled,
        bold: wrapWith('1', '22'),
        dim: wrapWith('2', '22'),
        italic: wrapWith('3', '23'),
        underline: wrapWith('4', '24'),
        inverse: wrapWith('7', '27'),
        accent: wrapWith('36', '39'),
        success: wrapWith('32', '39'),
        warning: wrapWith('33', '39'),
        error: wrapWith('31', '39'),
        info: wrapWith('34', '39'),
        muted: wrapWith('90', '39'),
        magenta: wrapWith('35', '39'),
        color256: (code: number, text: string) => (enabled && text ? `\x1b[38;5;${code}m${text}\x1b[39m` : text),
    };
}
