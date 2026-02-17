import { removeMarkdownFormatting, removeMarkdownLinks } from '@promptbook-local/markdown-utils';

/** Matches fenced code blocks (```...```). */
const CODE_FENCE_PATTERN = /```[\s\S]*?```/g;
/** Matches inline code wrapped in 1-3 backticks. */
const INLINE_CODE_PATTERN = /`{1,3}([^`]+?)`{1,3}/g;
/** Matches Markdown images with alt text. */
const IMAGE_MARKDOWN_PATTERN = /!\[([^\]]*?)\]\((?:[^)]+)\)/g;
/** Finds URLs and bare domains that should be removed. */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+\b/gi;
/** Strips escaped Markdown characters. */
const ESCAPED_CHAR_PATTERN = /\\([\\`*_{}[\]()#+\-.!])/g;
/** Removes checkbox list markers. */
const LIST_CHECKBOX_PATTERN = /^\s*[-+*]\s*\[[ xX]\]\s*/gm;
/** Removes unordered list bullets. */
const LIST_BULLET_PATTERN = /^\s*([-+*])\s+/gm;
/** Removes numbered list prefixes. */
const LIST_NUMBER_PATTERN = /^\s*\d+\.\s+/gm;
/** Strips blockquote prefixes. */
const BLOCKQUOTE_PATTERN = /^\s*>+\s+/gm;
/** Matches Markdown headings (#). */
const HEADING_PATTERN = /^\s*#{1,6}\s*/gm;
/** Matches horizontal rules (---, ***, ___). */
const HORIZONTAL_RULE_PATTERN = /^\s*([-*_]){3,}\s*$/gm;
/** Replaces table pipe separators to avoid visual clutter. */
const TABLE_PIPE_PATTERN = /\s*\|\s*/g;
/** Converts empty reference links (like [label][1]). */
const EMPTY_LINK_REFERENCE_PATTERN = /\[([^\]]+)\]\s*\[\s*\d+\s*\]/g;
/** Removes footnote references such as [^1]. */
const FOOTNOTE_REFERENCE_PATTERN = /\[\^\d+\]/g;
/** Clears reference definition lines that appear at the bottom of Markdown files. */
const REFERENCE_DEFINITION_PATTERN = /^\s*\[[^\]]+\]:\s*\S+(?:\s+.*)?$/gm;
/** Strips HTML tags that might appear inside Markdown. */
const HTML_TAG_PATTERN = /<\/?[^>]+>/g;
/** Removes citation brackets used by some knowledge sources. */
const CITATION_BRACKET_PATTERN = /[【】]/g;
/** Removes the dagger symbol sometimes used in citations. */
const DAGGER_PATTERN = /†/g;
/** Collapses multiple consecutive newlines. */
const DOUBLE_NEWLINE_PATTERN = /\n{2,}/g;

/** HTML entity replacements to keep the text readable. */
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
 * Options customizing how Markdown stripping handles whitespace conversions.
 */
export type StripMarkdownTextOptions = {
    doubleNewlineReplacement?: string;
    newlineReplacement?: string;
    whitespaceReplacement?: string;
};

/**
 * Strips Markdown, HTML, citation, and URL noise from a string, leaving a
 * normalized plain-text version ready for UI preview or other display layers.
 */
export function stripMarkdownText(value: string, options: StripMarkdownTextOptions = {}): string {
    let normalizedText = value.replace(/\r\n/g, '\n');

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

    const doubleNewlineReplacement = options.doubleNewlineReplacement ?? ' ';
    normalizedText = normalizedText.replace(DOUBLE_NEWLINE_PATTERN, doubleNewlineReplacement);
    const newlineReplacement = options.newlineReplacement ?? ' ';
    normalizedText = normalizedText.replace(/\n/g, newlineReplacement);
    const whitespaceReplacement = options.whitespaceReplacement ?? ' ';
    normalizedText = normalizedText.replace(/\s+/g, whitespaceReplacement);

    for (const [pattern, replacement] of HTML_ENTITY_REPLACEMENTS) {
        normalizedText = normalizedText.replace(pattern, replacement);
    }

    return normalizedText.trim();
}
