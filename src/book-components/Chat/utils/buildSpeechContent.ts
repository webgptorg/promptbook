'use client';

import type { string_markdown } from '../../types/typeAliases';
import { removeMarkdownComments } from '../../../utils/markdown/removeMarkdownComments';
import { removeMarkdownFormatting } from '../../../utils/markdown/removeMarkdownFormatting';
import { removeMarkdownLinks } from '../../../utils/markdown/removeMarkdownLinks';

const CITATION_PATTERN = /\u3010[^\u3011]*\u3011/g;

/**
 * Normalizes chat markdown into a clean text string that ElevenLabs or any other
 * text-to-speech provider can voice without reading UI details.
 *
 * @param content Message markdown (already stripped of buttons).
 * @returns Sanitized text ready for text-to-speech.
 * @private internal helper for `<ChatMessageItem/>` rendering
 */
export function buildSpeechContent(content: string_markdown): string {
    let normalized = content.trim();
    if (normalized === '') {
        return '';
    }

    normalized = removeMarkdownComments(normalized);
    normalized = removeMarkdownLinks(normalized);
    normalized = removeMarkdownFormatting(normalized);
    normalized = normalized.replace(CITATION_PATTERN, '');
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized.trim();
}
