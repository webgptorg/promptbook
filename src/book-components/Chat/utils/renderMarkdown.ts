import katex from 'katex';
import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/string_markdown';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { createCitationMarkerRegex, parseCitationMarker } from '../utils/parseCitationMarker';
import styles from '../MarkdownContent/MarkdownContent.module.css';

/**
 * Normalizes markdown sublists so they render correctly under ordered list items.
 *
 * @param markdown - Markdown content to normalize.
 * @returns Markdown with normalized sublist indentation.
 *
 * @private utility of Chat markdown rendering
 */
function normalizeMarkdownSublists(markdown: string_markdown): string_markdown {
    const lines = markdown.split(/\r?\n/);
    let orderedIndent: number | null = null;
    let shouldIndentUnordered = false;
    let activeFence: '```' | '~~~' | null = null;

    const normalizedLines = lines.map((line) => {
        const trimmedLine = line.trim();

        const fenceMatch = trimmedLine.match(/^(```|~~~)/);
        if (fenceMatch) {
            const fence = fenceMatch[1] as '```' | '~~~';
            activeFence = activeFence === fence ? null : fence;
            return line;
        }

        if (activeFence) {
            return line;
        }

        if (trimmedLine === '') {
            return line;
        }

        const orderedMatch = line.match(/^(\s*)(\d+)\.\s+/);
        if (orderedMatch) {
            orderedIndent = orderedMatch[1]!.length;
            shouldIndentUnordered = true;
            return line;
        }

        const unorderedMatch = line.match(/^(\s*)([-+*])\s+/);
        if (unorderedMatch) {
            if (shouldIndentUnordered && orderedIndent !== null) {
                const currentIndent = unorderedMatch[1]!.length;
                const targetIndent = orderedIndent + 4;

                if (currentIndent < targetIndent) {
                    return `${' '.repeat(targetIndent)}${line.trimStart()}`;
                }
            }

            return line;
        }

        orderedIndent = null;
        shouldIndentUnordered = false;

        return line;
    });

    return normalizedLines.join('\n') as string_markdown;
}

/**
 * Creates a showdown converter configured for chat markdown rendering.
 *
 * @private utility of Chat markdown rendering
 */
function createChatMarkdownConverter(): ShowdownConverter {
    return new ShowdownConverter({
        flavor: 'github',
        tables: true,
        strikethrough: true,
        tasklists: true,
        ghCodeBlocks: true,
        ghMentions: false,
        ghMentionsLink: '',
        openLinksInNewWindow: true,
        backslashEscapesHTMLTags: true,
        emoji: true,
        underline: true,
        completeHTMLDocument: false,
        metadata: false,
        splitAdjacentBlockquotes: true,
        noHeaderId: true,
        headerLevelStart: 1,
        parseImgDimensions: true,
        simplifiedAutoLink: true,
        literalMidWordUnderscores: true,
        literalMidWordAsterisks: false,
        simpleLineBreaks: true,
        requireSpaceBeforeHeadingText: true,
        ghCompatibleHeaderId: true,
        prefixHeaderId: 'chat-header-',
        rawPrefixHeaderId: false,
        rawHeaderId: false,
        smoothLivePreview: true,
        smartIndentationFix: true,
        disableForced4SpacesIndentedSublists: false,
        encodeEmails: true,
        extensions: [
            () => ({
                type: 'lang',
                regex: createCitationMarkerRegex(),
                replace: (match: string) => {
                    const citationMarker = parseCitationMarker(match);
                    if (!citationMarker) {
                        return match;
                    }

                    TODO_USE(citationMarker.source);

                    return `<sup class="${styles.citationRef}">[${citationMarker.id}]</sup>`;
                },
            }),
        ],
    });
}

/**
 * Pre-configured showdown converter for chat markdown.
 *
 * @private utility of Chat markdown rendering
 */
const chatMarkdownConverter = createChatMarkdownConverter();

/**
 * Definition of math delimiter.
 */
type MathDelimiterDefinition = {
    regex: RegExp;
    displayMode: boolean;
};

/**
 * Collection of math delimiter definitions.
 */
const mathDelimiterDefinitions: ReadonlyArray<MathDelimiterDefinition> = [
    { regex: /(^|[^\\])\$\$([\s\S]+?)\$\$/g, displayMode: true },
    { regex: /(^|[^\\])\\\[([\s\S]+?)\\\]/g, displayMode: true },
    { regex: /(^|[^\\])\\\(([\s\S]+?)\\\)/g, displayMode: false },
    { regex: /(^|[^\\])\$([^$\n]+?)\$/g, displayMode: false },
];

/**
 * Pattern matching CODE FENCE.
 */
const CODE_FENCE_REGEX = /(`{3,}|~{3,})(?:[^\n\r]*)\r?\n[\s\S]*?\r?\n\1[^\n\r]*/g;
/**
 * Pattern matching INLINE CODE.
 */
const INLINE_CODE_REGEX = /(`+)([\s\S]*?)(\1)/g;
/**
 * Prefix for CODE PLACEHOLDER.
 */
const CODE_PLACEHOLDER_PREFIX = '@@PROMPTBOOK_CODE_PLACEHOLDER__';
/**
 * Pattern matching CODE PLACEHOLDER.
 */
const CODE_PLACEHOLDER_REGEX = new RegExp(`${CODE_PLACEHOLDER_PREFIX}(\\d+)__`, 'g');

/**
 * Pattern matching DETAILS BLOCK.
 */
const DETAILS_BLOCK_REGEX = /<details[\s\S]*?<\/details\s*>/gi;
/**
 * Prefix for DETAILS PLACEHOLDER.
 */
const DETAILS_PLACEHOLDER_PREFIX = '@@PROMPTBOOK_DETAILS_PLACEHOLDER__';
/**
 * Pattern matching DETAILS PLACEHOLDER.
 */
const DETAILS_PLACEHOLDER_REGEX = new RegExp(`${DETAILS_PLACEHOLDER_PREFIX}(\\d+)__`, 'g');
/**
 * Matches a Showdown-wrapped placeholder such as `<p>@@PROMPTBOOK_DETAILS_PLACEHOLDER__0__</p>`.
 */
const DETAILS_PLACEHOLDER_WRAPPED_REGEX = new RegExp(`<p>\\s*(${DETAILS_PLACEHOLDER_PREFIX}\\d+__)\\s*<\\/p>`, 'g');

/**
 * Result of masked code segments.
 */
type MaskedCodeSegmentsResult = {
    masked: string_markdown;
    restore: (value: string_markdown) => string_markdown;
};

/**
 * Result of masked details blocks.
 */
type MaskedDetailsBlocksResult = {
    masked: string_markdown;
    restore: (value: string_html) => string_html;
};

/**
 * Renders the body of one raw `<details>` block as markdown while keeping the
 * outer `<details>` and optional `<summary>` markup untouched.
 *
 * @param detailsBlock - Raw `<details>...</details>` HTML captured from markdown.
 * @returns `<details>` HTML whose body has been converted from markdown to HTML.
 *
 * @private utility of Chat markdown rendering
 */
function renderDetailsBlock(detailsBlock: string): string_html {
    const openTagMatch = detailsBlock.match(/^<details\b[^>]*>/i);
    const closeTagMatch = detailsBlock.match(/<\/details\s*>$/i);

    if (!openTagMatch || !closeTagMatch) {
        return detailsBlock as string_html;
    }

    const openTag = openTagMatch[0];
    const closeTag = closeTagMatch[0];
    const innerContent = detailsBlock.slice(openTag.length, detailsBlock.length - closeTag.length);
    const summaryMatch = innerContent.match(/^(\s*<summary\b[^>]*>[\s\S]*?<\/summary\s*>)([\s\S]*)$/i);
    const summaryHtml = summaryMatch?.[1] ?? '';
    const bodyMarkdown = (summaryMatch?.[2] ?? innerContent) as string_markdown;
    const renderedBody = renderMarkdown(bodyMarkdown);

    return `${openTag}${summaryHtml}${renderedBody}${closeTag}` as string_html;
}

/**
 * Masks inline and fenced code segments so math rendering never touches them.
 *
 * @param markdown - Markdown text to mask.
 * @returns Masked markdown and a restore helper.
 *
 * @private utility of Chat markdown rendering
 */
function maskMarkdownCodeSegments(markdown: string_markdown): MaskedCodeSegmentsResult {
    const segments: string[] = [];
    let masked = markdown;

    const addPlaceholder = (segment: string) => {
        const placeholder = `${CODE_PLACEHOLDER_PREFIX}${segments.length}__`;
        segments.push(segment);
        return placeholder;
    };

    const maskWith = (regex: RegExp) => {
        regex.lastIndex = 0;
        masked = masked.replace(regex, (match) => addPlaceholder(match));
    };

    maskWith(CODE_FENCE_REGEX);
    maskWith(INLINE_CODE_REGEX);

    return {
        masked: masked as string_markdown,
        restore(value: string_markdown): string_markdown {
            return value.replace(CODE_PLACEHOLDER_REGEX, (_match, index) => segments[Number(index)] ?? '');
        },
    };
}

/**
 * Masks `<details>…</details>` blocks in the markdown source so that Showdown never
 * processes their content (which would break them with `simpleLineBreaks: true`).
 *
 * @param markdown - Markdown text that may contain raw HTML `<details>` blocks.
 * @returns Masked markdown and a restore helper that returns `string_html`.
 *
 * @private utility of Chat markdown rendering
 */
function maskDetailsBlocks(markdown: string_markdown): MaskedDetailsBlocksResult {
    const blocks: string_html[] = [];

    DETAILS_BLOCK_REGEX.lastIndex = 0;
    const masked = markdown.replace(DETAILS_BLOCK_REGEX, (match) => {
        const placeholder = `${DETAILS_PLACEHOLDER_PREFIX}${blocks.length}__`;
        blocks.push(renderDetailsBlock(match));
        return placeholder;
    }) as string_markdown;

    return {
        masked,
        restore(value: string_html): string_html {
            return value
                .replace(DETAILS_PLACEHOLDER_WRAPPED_REGEX, '$1')
                .replace(DETAILS_PLACEHOLDER_REGEX, (_match, index) => blocks[Number(index)] ?? '') as string_html;
        },
    };
}

/**
 * Replaces one math delimiter pair with KaTeX output.
 *
 * @private utility of Chat markdown rendering
 */
function replaceMathDelimiter(markdown: string, delimiter: MathDelimiterDefinition): string {
    return markdown.replace(delimiter.regex, (...args) => {
        const match = args[0] ?? '';
        const prefix = args[1] ?? '';
        const math = args[2] ?? '';

        if (!math) {
            return match;
        }

        try {
            const rendered = katex.renderToString(math, {
                displayMode: delimiter.displayMode,
                throwOnError: false,
            });
            return `${prefix}${rendered}`;
        } catch {
            return match;
        }
    });
}

/**
 * Renders math expressions in markdown using KaTeX for the supported delimiter pairs.
 *
 * @private utility of Chat markdown rendering
 */
function renderMathInMarkdown(markdown: string): string {
    const { masked, restore } = maskMarkdownCodeSegments(markdown);
    let processed = masked;

    for (const delimiter of mathDelimiterDefinitions) {
        processed = replaceMathDelimiter(processed, delimiter);
    }
    processed = processed.replace(/\\$/g, '$');
    return restore(processed);
}

/**
 * Converts chat markdown to sanitized HTML.
 *
 * @param markdown - The markdown content to convert.
 * @returns HTML string ready for rendering or export.
 *
 * @private utility of Chat markdown rendering
 */
export function renderMarkdown(markdown: string_markdown): string_html {
    if (!markdown || typeof markdown !== 'string') {
        return '' as string_html;
    }

    try {
        const normalizedMarkdown = normalizeMarkdownSublists(markdown);
        const { masked: maskedMarkdown, restore: restoreDetails } = maskDetailsBlocks(normalizedMarkdown);
        const processedMarkdown = renderMathInMarkdown(maskedMarkdown);
        const html = chatMarkdownConverter.makeHtml(processedMarkdown);

        if (typeof window !== 'undefined' && html.match(/class="katex/)) {
            const katexCssId = 'katex-css';
            if (!window.document.getElementById(katexCssId)) {
                const link = window.document.createElement('link');
                link.id = katexCssId;
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                window.document.head.appendChild(link);
            }
        }

        const restoredHtml = restoreDetails(html as string_html);
        const sanitizedHtml = restoredHtml
            .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
            .replace(/\s+on\w+="[^"]*"/gi, '')
            .replace(/\s+on\w+='[^']*'/gi, '')
            .replace(/\s+(href|src)\s*=\s*(['"])\s*(javascript:|data:|vbscript:)[^'"]*\2/gi, '');

        return sanitizedHtml as string_html;
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return markdown.replace(/[<>&"']/g, (character) => {
            const entities: Record<string, string> = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#39;',
            };
            return entities[character] || character;
        }) as string_html;
    }
}
