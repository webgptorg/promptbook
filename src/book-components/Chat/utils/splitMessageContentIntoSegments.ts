import type { GeoJsonObject } from 'geojson';
import type { ImagePromptSegment } from './parseImagePrompts';
import { splitMessageContentByImagePrompts } from './parseImagePrompts';

/**
 * Regex that matches fenced GeoJSON code blocks inside chat messages.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const GEOJSON_BLOCK_REGEX = /```geojson\s*([\s\S]*?)```/gim;

/**
 * Segment that represents plain markdown text inside a chat message.
 */
/**
 * Segment that represents plain markdown text inside a chat message.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ChatTextSegment = {
    type: 'text';
    content: string;
};

/**
 * Segment that represents a Leaflet-ready map rendered from GeoJSON data.
 */
/**
 * Segment that represents a Leaflet-ready map rendered from GeoJSON data.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ChatMapSegment = {
    type: 'map';
    data: GeoJsonObject;
};

/**
 * Segment that represents a fenced code block inside a chat message.
 */
/**
 * Segment that represents a fenced code block inside a chat message.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ChatCodeSegment = {
    type: 'code';
    language?: string;
    code: string;
};

/**
 * Composite segment type that covers text, image prompts, map features, and code blocks.
 */
/**
 * Composite segment type that covers text, image prompts, map features, and code blocks.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ChatMessageContentSegment = ImagePromptSegment | ChatTextSegment | ChatMapSegment | ChatCodeSegment;

/**
 * Parses a fenced GeoJSON block payload into a `GeoJsonObject`.
 *
 * @param value - Raw string inside the fenced code block.
 * @returns Parsed GeoJSON object or `null` when parsing fails.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function parseGeoJsonValue(value: string): GeoJsonObject | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        return JSON.parse(trimmed) as GeoJsonObject;
    } catch {
        return null;
    }
}

/**
 * Splits markdown content by inline GeoJSON blocks, keeping text and map segments in order.
 *
 * @param content - Markdown text produced by the agent.
 * @returns Array of text and map segments preserving the original flow.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function splitTextByGeoJsonBlocks(content: string): Array<ChatMessageContentSegment> {
    if (!content) {
        return [{ type: 'text', content }];
    }

    const segments: Array<ChatMessageContentSegment> = [];
    let lastIndex = 0;
    GEOJSON_BLOCK_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = GEOJSON_BLOCK_REGEX.exec(content)) !== null) {
        const fullMatch = match[0];
        const matchedValue = match[1] ?? '';
        const start = match.index;

        if (start > lastIndex) {
            segments.push({ type: 'text', content: content.slice(lastIndex, start) });
        }

        const geojson = parseGeoJsonValue(matchedValue);
        if (geojson) {
            segments.push({ type: 'map', data: geojson });
        } else {
            segments.push({ type: 'text', content: fullMatch });
        }

        lastIndex = start + fullMatch.length;
    }

    if (lastIndex < content.length) {
        segments.push({ type: 'text', content: content.slice(lastIndex) });
    }

    if (segments.length === 0) {
        return [{ type: 'text', content }];
    }

    return segments;
}

/**
 * Matches the opening line of a fenced code block (backticks or tildes).
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const CODE_FENCE_HEADER_REGEX = /^\s*(`{3,}|~{3,})(.*)$/;

/**
 * Character set that must be escaped before embedding in a regexp.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const ESCAPE_REGEXP = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes special regexp characters in the supplied string.
 *
 * @param value - Input text to escape.
 * @returns Escaped string safe for constructing dynamic regexp patterns.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function escapeRegExp(value: string): string {
    return value.replace(ESCAPE_REGEXP, '\\$&');
}

/**
 * Describes the span and newline length of a single line within a markdown string.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type LineRange = {
    readonly lineStart: number;
    readonly lineEnd: number;
    readonly newlineLength: number;
};

/**
 * Computes the start/end cursors for the line that contains the provided position.
 *
 * @param content - Full markdown string being scanned.
 * @param position - Cursor position inside the string.
 * @returns Boundaries that frame the line and its trailing newline.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function getLineRange(content: string, position: number): LineRange {
    const start = position;
    let end = start;

    while (end < content.length) {
        const char = content[end];
        if (char === '\n' || char === '\r') {
            break;
        }
        end++;
    }

    let newlineLength = 0;
    if (end < content.length) {
        const char = content[end];
        if (char === '\r' && end + 1 < content.length && content[end + 1] === '\n') {
            newlineLength = 2;
        } else if (char === '\r' || char === '\n') {
            newlineLength = 1;
        }
    }

    return {
        lineStart: start,
        lineEnd: end,
        newlineLength,
    };
}

/**
 * Describes the boundaries of a closing code-fence line.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type ClosingFenceMatch = {
    readonly lineStartIndex: number;
    readonly lineEndIndex: number;
};

/**
 * Searches forward for a code-fence closing line that matches the opener.
 *
 * @param content - Markdown being scanned.
 * @param startIndex - Position immediately after the opening fence line.
 * @param fenceCharacter - Either `` ` `` or `~` depending on the opener used.
 * @param minimumLength - Minimum count of repeated characters required for closure.
 * @returns Line boundaries where the closing fence was found or `null` if none exists.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function findClosingFence(
    content: string,
    startIndex: number,
    fenceCharacter: '`' | '~',
    minimumLength: number,
): ClosingFenceMatch | null {
    const closingPattern = new RegExp(`^${escapeRegExp(fenceCharacter)}{${minimumLength},}$`);
    let scanIndex = startIndex;

    while (scanIndex < content.length) {
        const { lineStart, lineEnd, newlineLength } = getLineRange(content, scanIndex);
        const trimmedLine = content.slice(lineStart, lineEnd).trim();

        if (closingPattern.test(trimmedLine)) {
            return {
                lineStartIndex: lineStart,
                lineEndIndex: lineEnd + newlineLength,
            };
        }

        if (lineEnd + newlineLength >= content.length) {
            break;
        }

        scanIndex = lineEnd + newlineLength;
    }

    return null;
}

/**
 * Splits a text segment into plain text and fenced-code snippets so they can be rendered separately.
 *
 * @param content - Markdown fragment to analyze.
 * @returns Array mixing text and code segments in the original order.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function splitTextByCodeBlocks(content: string): Array<ChatTextSegment | ChatCodeSegment> {
    if (!content) {
        return [{ type: 'text', content }];
    }

    const segments: Array<ChatTextSegment | ChatCodeSegment> = [];
    let scanIndex = 0;
    let textStartIndex = 0;

    while (scanIndex < content.length) {
        const { lineStart, lineEnd, newlineLength } = getLineRange(content, scanIndex);
        const lineText = content.slice(lineStart, lineEnd);
        const headerMatch = CODE_FENCE_HEADER_REGEX.exec(lineText);
        scanIndex = lineEnd + newlineLength;

        if (!headerMatch) {
            continue;
        }

        if (newlineLength === 0 && lineEnd === content.length) {
            // Incomplete header at the end of the content; treat as text.
            break;
        }

        const fence = headerMatch[1];
        if (!fence) {
            continue;
        }

        const language = (headerMatch[2] ?? '').trim();
        const normalizedLanguage = language.toLowerCase();
        const fenceEndIndex = lineEnd + newlineLength;

        if (normalizedLanguage === 'geojson') {
            const closingFence = findClosingFence(content, fenceEndIndex, fence[0] as '`' | '~', fence.length);
            if (!closingFence) {
                segments.push({
                    type: 'text',
                    content: content.slice(lineStart),
                });
                return segments;
            }

            scanIndex = closingFence.lineEndIndex;
            continue;
        }

        if (textStartIndex < lineStart) {
            segments.push({
                type: 'text',
                content: content.slice(textStartIndex, lineStart),
            });
        }

        const closingFence = findClosingFence(content, fenceEndIndex, fence[0] as '`' | '~', fence.length);
        if (!closingFence) {
            segments.push({
                type: 'text',
                content: content.slice(lineStart),
            });
            return segments;
        }

        const codeContent = content.slice(fenceEndIndex, closingFence.lineStartIndex);
        segments.push({
            type: 'code',
            language: language || undefined,
            code: codeContent,
        });

        textStartIndex = closingFence.lineEndIndex;
        scanIndex = closingFence.lineEndIndex;
    }

    if (textStartIndex < content.length) {
        segments.push({
            type: 'text',
            content: content.slice(textStartIndex),
        });
    }

    return segments.length === 0 ? [{ type: 'text', content }] : segments;
}

/**
 * Splits chat message content into markdown, image prompt, and map segments while preserving their order.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function splitMessageContentIntoSegments(content: string): ReadonlyArray<ChatMessageContentSegment> {
    const imageSegments = splitMessageContentByImagePrompts(content);

    return imageSegments.flatMap((segment) => {
        if (segment.type !== 'text') {
            return segment;
        }

        const normalizedSegments: Array<ChatMessageContentSegment> = [];
        const geojsonSegments = splitTextByGeoJsonBlocks(segment.content);

        for (const nestedSegment of geojsonSegments) {
            if (nestedSegment.type === 'text') {
                normalizedSegments.push(...splitTextByCodeBlocks(nestedSegment.content));
                continue;
            }

            normalizedSegments.push(nestedSegment);
        }

        return normalizedSegments;
    });
}
