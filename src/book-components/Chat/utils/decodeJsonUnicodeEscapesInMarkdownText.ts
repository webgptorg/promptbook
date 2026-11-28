import type { string_markdown } from '../../../types/string_markdown';

/**
 * Pattern for detecting JSON-style Unicode escape sequences in model text.
 *
 * @private utility of chat message postprocessing
 */
const JSON_UNICODE_ESCAPE_DETECTION_PATTERN = /\\u[0-9a-fA-F]{4}/;

/**
 * Pattern for decoding JSON-style Unicode escape sequences in model text.
 *
 * @private utility of chat message postprocessing
 */
const JSON_UNICODE_ESCAPE_PATTERN = /\\u([0-9a-fA-F]{4})/g;

/**
 * Pattern for detecting fenced markdown code-block boundaries.
 *
 * @private utility of chat message postprocessing
 */
const MARKDOWN_CODE_FENCE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})/;

/**
 * Minimum code point decoded by the chat Unicode escape normalizer.
 *
 * ASCII escapes can be intentional in JSON and security-sensitive examples, so this
 * helper only decodes non-ASCII characters that were visibly broken in chat text.
 *
 * @private utility of chat message postprocessing
 */
const FIRST_NON_ASCII_CODE_POINT = 0x80;

/**
 * Markdown fence state while scanning chat text line-by-line.
 *
 * @private utility of chat message postprocessing
 */
type MarkdownFenceState = {
    readonly marker: '`' | '~';
    readonly length: number;
};

/**
 * Decodes JSON-style Unicode escape sequences in markdown prose while preserving code.
 *
 * Model/tool output can occasionally arrive as already JSON-escaped text, which makes
 * natural-language replies render `\u00fd` instead of the decoded character. This
 * keeps code examples intact by skipping fenced code blocks and inline code spans.
 *
 * @param markdown - Markdown chat content to normalize for display.
 * @returns Markdown chat content with non-ASCII JSON Unicode escapes decoded.
 *
 * @private internal utility of `<Chat/>`
 */
export function decodeJsonUnicodeEscapesInMarkdownText(markdown: string_markdown): string_markdown {
    if (!JSON_UNICODE_ESCAPE_DETECTION_PATTERN.test(markdown)) {
        return markdown;
    }

    const parts = markdown.split(/(\r\n|\r|\n)/);
    let fenceState: MarkdownFenceState | null = null;
    let normalizedMarkdown = '';

    for (let index = 0; index < parts.length; index += 2) {
        const line = parts[index] ?? '';
        const newline = parts[index + 1] ?? '';
        const fenceBoundary = resolveMarkdownFenceBoundary(line);

        if (fenceState) {
            normalizedMarkdown += line + newline;
            if (
                fenceBoundary &&
                fenceBoundary.marker === fenceState.marker &&
                fenceBoundary.length >= fenceState.length
            ) {
                fenceState = null;
            }
            continue;
        }

        if (fenceBoundary) {
            fenceState = fenceBoundary;
            normalizedMarkdown += line + newline;
            continue;
        }

        normalizedMarkdown += decodeJsonUnicodeEscapesOutsideInlineCode(line) + newline;
    }

    return normalizedMarkdown as string_markdown;
}

/**
 * Resolves one markdown code-fence boundary from a line.
 *
 * @private utility of `decodeJsonUnicodeEscapesInMarkdownText`
 */
function resolveMarkdownFenceBoundary(line: string): MarkdownFenceState | null {
    const match = line.match(MARKDOWN_CODE_FENCE_PATTERN);
    const fenceMarker = match?.[1];

    if (!fenceMarker) {
        return null;
    }

    return {
        marker: fenceMarker[0] as MarkdownFenceState['marker'],
        length: fenceMarker.length,
    };
}

/**
 * Decodes Unicode escapes in one markdown line while skipping inline code spans.
 *
 * @private utility of `decodeJsonUnicodeEscapesInMarkdownText`
 */
function decodeJsonUnicodeEscapesOutsideInlineCode(line: string): string {
    let normalizedLine = '';
    let cursor = 0;

    while (cursor < line.length) {
        const openingDelimiterStart = line.indexOf('`', cursor);
        if (openingDelimiterStart === -1) {
            normalizedLine += decodeJsonUnicodeEscapesInText(line.slice(cursor));
            break;
        }

        const openingDelimiterEnd = findBacktickRunEnd(line, openingDelimiterStart);
        const openingDelimiter = line.slice(openingDelimiterStart, openingDelimiterEnd);
        const closingDelimiterStart = line.indexOf(openingDelimiter, openingDelimiterEnd);

        normalizedLine += decodeJsonUnicodeEscapesInText(line.slice(cursor, openingDelimiterStart));

        if (closingDelimiterStart === -1) {
            normalizedLine += line.slice(openingDelimiterStart);
            break;
        }

        const closingDelimiterEnd = closingDelimiterStart + openingDelimiter.length;
        normalizedLine += line.slice(openingDelimiterStart, closingDelimiterEnd);
        cursor = closingDelimiterEnd;
    }

    return normalizedLine;
}

/**
 * Finds the first character after one contiguous run of backticks.
 *
 * @private utility of `decodeJsonUnicodeEscapesInMarkdownText`
 */
function findBacktickRunEnd(line: string, startIndex: number): number {
    let cursor = startIndex;

    while (cursor < line.length && line[cursor] === '`') {
        cursor++;
    }

    return cursor;
}

/**
 * Decodes non-ASCII JSON Unicode escapes in plain text.
 *
 * @private utility of `decodeJsonUnicodeEscapesInMarkdownText`
 */
function decodeJsonUnicodeEscapesInText(text: string): string {
    return text.replace(JSON_UNICODE_ESCAPE_PATTERN, (match, hexadecimalCodePoint: string) => {
        const codePoint = Number.parseInt(hexadecimalCodePoint, 16);

        if (codePoint < FIRST_NON_ASCII_CODE_POINT) {
            return match;
        }

        return String.fromCharCode(codePoint);
    });
}
