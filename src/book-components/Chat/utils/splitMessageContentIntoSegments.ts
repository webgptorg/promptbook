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
 * Composite segment type that covers text, image prompts, and map features.
 */
/**
 * Composite segment type that covers text, image prompts, and map features.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export type ChatMessageContentSegment = ImagePromptSegment | ChatTextSegment | ChatMapSegment;

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

        return splitTextByGeoJsonBlocks(segment.content);
    });
}
