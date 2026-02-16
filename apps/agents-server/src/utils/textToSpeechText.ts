import { humanizeAiText, removeMarkdownFormatting, removeMarkdownLinks } from '@promptbook-local/markdown-utils';

const CODE_FENCE_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`{1,3}([^`]+?)`{1,3}/g;
const IMAGE_MARKDOWN_PATTERN = /!\[([^\]]*?)\]\((?:[^)]+)\)/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+\b/gi;
const ESCAPED_CHAR_PATTERN = /\\([\\`*_{}[\]()#+\-.!])/g;
const LIST_CHECKBOX_PATTERN = /^\s*[-+*]\s*\[[ xX]\]\s*/gm;
const LIST_BULLET_PATTERN = /^\s*([-+*])\s+/gm;
const LIST_NUMBER_PATTERN = /^\s*\d+\.\s+/gm;
const BLOCKQUOTE_PATTERN = /^\s*>+\s+/gm;
const HEADING_PATTERN = /^\s*#{1,6}\s*/gm;
const HORIZONTAL_RULE_PATTERN = /^\s*([-*_]){3,}\s*$/gm;
const TABLE_PIPE_PATTERN = /\s*\|\s*/g;
const EMPTY_LINK_REFERENCE_PATTERN = /\[([^\]]+)\]\s*\[\s*\d+\s*\]/g;
const FOOTNOTE_REFERENCE_PATTERN = /\[\^\d+\]/g;
const REFERENCE_DEFINITION_PATTERN = /^\s*\[[^\]]+\]:\s*\S+(?:\s+.*)?$/gm;
const HTML_TAG_PATTERN = /<\/?[^>]+>/g;
const CITATION_BRACKET_PATTERN = /[【】]/g;
const DAGGER_PATTERN = /†/g;
const DOUBLE_NEWLINE_PATTERN = /\n{2,}/g;

const HTML_ENTITY_REPLACEMENTS: Array<[RegExp, string]> = [
    [/&nbsp;/gi, ' '],
    [/&amp;/gi, '&'],
    [/&lt;/gi, '<'],
    [/&gt;/gi, '>'],
    [/&quot;/gi, '"'],
    [/&#39;/gi, "'"],
    [/&rsquo;/gi, "'"],
    [/&lsquo;/gi, "'"],
    [/&ldquo;/gi, '"'],
    [/&rdquo;/gi, '"'],
];

/**
 * Converts Markdown-heavy chat text into a plain string that is friendly for
 * text-to-speech systems. This removes formatting, links, HTML tags, code
 * fences, citations, and URLs while collapsing whitespace so the resulting
 * text can be spoken without confusing markup.
 *
 * @param text - Markdown text coming from the Agent Server chat.
 * @returns Text that is trimmed, punctuation-friendly, and safe to send to
 *          TTS providers; returns an empty string when the input is empty.
 */
export function textToSpeechText(text: string | null | undefined): string {
    if (!text) {
        return '';
    }

    let normalizedText = text.toString();

    normalizedText = normalizedText.replace(/\r\n/g, '\n');
    normalizedText = normalizedText.replace(CODE_FENCE_PATTERN, ' ');
    normalizedText = normalizedText.replace(INLINE_CODE_PATTERN, '$1');
    normalizedText = normalizedText.replace(IMAGE_MARKDOWN_PATTERN, '$1');

    normalizedText = removeMarkdownLinks(normalizedText);
    normalizedText = removeMarkdownFormatting(normalizedText);
    normalizedText = normalizedText.replace(/__([^_]+)__/g, '$1');
    normalizedText = normalizedText.replace(/_(.*?)_/g, '$1');
    normalizedText = normalizedText.replace(/~~(.+?)~~/g, '$1');

    normalizedText = normalizedText.replace(ESCAPED_CHAR_PATTERN, '$1');
    normalizedText = normalizedText.replace(LIST_CHECKBOX_PATTERN, '');
    normalizedText = normalizedText.replace(LIST_BULLET_PATTERN, '');
    normalizedText = normalizedText.replace(LIST_NUMBER_PATTERN, '');
    normalizedText = normalizedText.replace(BLOCKQUOTE_PATTERN, '');
    normalizedText = normalizedText.replace(HEADING_PATTERN, '');
    normalizedText = normalizedText.replace(HORIZONTAL_RULE_PATTERN, ' ');
    normalizedText = normalizedText.replace(TABLE_PIPE_PATTERN, ' ');
    normalizedText = normalizedText.replace(EMPTY_LINK_REFERENCE_PATTERN, '$1');
    normalizedText = normalizedText.replace(FOOTNOTE_REFERENCE_PATTERN, ' ');
    normalizedText = normalizedText.replace(REFERENCE_DEFINITION_PATTERN, '');

    normalizedText = normalizedText.replace(HTML_TAG_PATTERN, ' ');
    normalizedText = normalizedText.replace(CITATION_BRACKET_PATTERN, ' ');
    normalizedText = normalizedText.replace(DAGGER_PATTERN, ' ');
    normalizedText = normalizedText.replace(URL_PATTERN, ' ');
    normalizedText = normalizedText.replace(DOUBLE_NEWLINE_PATTERN, '. ');
    normalizedText = normalizedText.replace(/\n/g, ' ');
    normalizedText = normalizedText.replace(/\s+/g, ' ');

    for (const [pattern, replacement] of HTML_ENTITY_REPLACEMENTS) {
        normalizedText = normalizedText.replace(pattern, replacement);
    }

    normalizedText = normalizedText.trim();
    normalizedText = humanizeAiText(normalizedText);
    normalizedText = normalizedText.replace(/\s+/g, ' ');

    return normalizedText.trim();
}
