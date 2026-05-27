import createDOMPurify, {
    type Config as DomPurifyConfig,
    type DOMPurify as DomPurifyInstance,
    type UponSanitizeAttributeHookEvent as DomPurifyUponSanitizeAttributeHookEvent,
    type WindowLike as DomPurifyWindowLike,
} from 'dompurify';
import katex from 'katex';
import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/string_markdown';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { createCitationMarkerRegex, parseCitationMarker } from './parseCitationMarker';

/**
 * Default class name used for rendered citation references outside of CSS modules.
 */
const DEFAULT_CITATION_REFERENCE_CLASS_NAME = 'citationRef';

/**
 * Browser stylesheet id used when KaTeX output is rendered in a live chat component.
 */
const KATEX_STYLESHEET_ID = 'katex-css';

/**
 * CDN stylesheet loaded lazily when markdown contains KaTeX markup in the browser.
 */
const KATEX_STYLESHEET_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';

/**
 * Explicit allowlist of HTML tags that may survive markdown rendering.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_ALLOWED_TAGS = [
    'a',
    'annotation',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'details',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'input',
    'li',
    'math',
    'menclose',
    'mfrac',
    'mi',
    'mn',
    'mo',
    'mover',
    'mpadded',
    'mphantom',
    'mroot',
    'mrow',
    'msqrt',
    'mspace',
    'msub',
    'msubsup',
    'msup',
    'mstyle',
    'mtable',
    'mtd',
    'mtext',
    'mtr',
    'munder',
    'munderover',
    'ol',
    'p',
    'pre',
    's',
    'semantics',
    'span',
    'strong',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
] as const;

/**
 * Explicit allowlist of HTML attributes that may survive markdown rendering.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_ALLOWED_ATTRIBUTES = [
    'alt',
    'aria-hidden',
    'checked',
    'class',
    'colspan',
    'data-citation-footnote',
    'data-chat-progress-marker',
    'disabled',
    'encoding',
    'height',
    'href',
    'id',
    'open',
    'rel',
    'rowspan',
    'src',
    'start',
    'stretchy',
    'style',
    'target',
    'title',
    'type',
    'width',
    'xmlns',
] as const;

/**
 * Attributes that may contain external URLs and therefore need protocol validation.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_URL_ATTRIBUTES = ['href', 'src'] as const;

/**
 * URL protocols that remain allowed after markdown sanitization.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_ALLOWED_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * Internal `data-*` attributes that Promptbook injects into rendered markdown and must survive sanitization.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_ALLOWED_DATA_ATTRIBUTES = new Set(['data-citation-footnote', 'data-chat-progress-marker']);

/**
 * Highest ASCII control character code that should be stripped from sanitized URLs.
 *
 * @private utility of `renderMarkdown`
 */
const MAX_ASCII_CONTROL_CHARACTER_CODE = 32;

/**
 * ASCII delete character code that should be stripped from sanitized URLs.
 *
 * @private utility of `renderMarkdown`
 */
const ASCII_DELETE_CHARACTER_CODE = 127;

/**
 * DOMPurify configuration used for markdown rendering and export sanitization.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_CONFIG: DomPurifyConfig = {
    ALLOWED_TAGS: [...MARKDOWN_SANITIZER_ALLOWED_TAGS],
    ALLOWED_ATTR: [...MARKDOWN_SANITIZER_ALLOWED_ATTRIBUTES],
    ALLOW_ARIA_ATTR: true,
    ALLOW_DATA_ATTR: false,
    USE_PROFILES: {
        html: true,
        mathMl: true,
        svg: false,
    },
};

/**
 * Shared browser-side DOMPurify instance.
 *
 * @private utility of `renderMarkdown`
 */
let browserMarkdownSanitizer: DomPurifyInstance | null = null;

/**
 * Shared server-side DOMPurify instance.
 *
 * @private utility of `renderMarkdown`
 */
let serverMarkdownSanitizer: DomPurifyInstance | null = null;

/**
 * Shared JSDOM window backing the server-side DOMPurify instance.
 *
 * @private utility of `renderMarkdown`
 */
let serverMarkdownSanitizerWindow: DomPurifyWindowLike | null = null;

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
 * Markdown patterns that are strong enough to identify content as markdown.
 */
const MARKDOWN_CONTENT_PATTERNS: ReadonlyArray<RegExp> = [
    /^#{1,6}\s+/m,
    /\*\*[^*]+\*\*/,
    /(^|[^*])\*[^*\n]+\*/,
    /`[^`]+`/,
    /```[\s\S]*?```/,
    /^\s*[-+*]\s+/m,
    /^\s*\d+\.\s+/m,
    /^\s*>\s+/m,
    /\[[^\]]+\]\([^)]+\)/,
    /!\[[^\]]*]\([^)]+\)/,
    /^\s*\|.+\|\s*$/m,
    /~~[^~]+~~/,
    /^\s*---+\s*$/m,
];

/**
 * Collection of math delimiter definitions.
 */
const MATH_DELIMITER_DEFINITIONS: ReadonlyArray<MathDelimiterDefinition> = [
    { regex: /(^|[^\\])\$\$([\s\S]+?)\$\$/g, displayMode: true },
    { regex: /(^|[^\\])\\\[([\s\S]+?)\\\]/g, displayMode: true },
    { regex: /(^|[^\\])\\\(([\s\S]+?)\\\)/g, displayMode: false },
    { regex: /(^|[^\\])\$([^$\n]+?)\$/g, displayMode: false },
];

/**
 * Definition of math delimiter.
 */
type MathDelimiterDefinition = {
    regex: RegExp;
    displayMode: boolean;
};

/**
 * Options for markdown rendering.
 */
type RenderMarkdownOptions = {
    readonly citationReferenceClassName?: string;
};

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
 * Removes whitespace and control characters that can obscure a URL protocol.
 *
 * @private utility of `renderMarkdown`
 */
function normalizeSanitizedUrlValue(value: string): string {
    return Array.from(value.trim())
        .filter((character) => {
            const characterCode = character.charCodeAt(0);

            return characterCode > MAX_ASCII_CONTROL_CHARACTER_CODE && characterCode !== ASCII_DELETE_CHARACTER_CODE;
        })
        .join('');
}

/**
 * Returns whether a sanitized URL attribute still uses an allowed protocol.
 *
 * @private utility of `renderMarkdown`
 */
function isAllowedSanitizedUrl(value: string): boolean {
    const normalizedValue = normalizeSanitizedUrlValue(value);

    if (normalizedValue === '') {
        return true;
    }

    if (
        normalizedValue.startsWith('#') ||
        normalizedValue.startsWith('/') ||
        normalizedValue.startsWith('./') ||
        normalizedValue.startsWith('../') ||
        normalizedValue.startsWith('?') ||
        normalizedValue.startsWith('//')
    ) {
        return true;
    }

    const schemeMatch = normalizedValue.match(/^([a-z][a-z0-9+.-]*):/i);
    if (!schemeMatch) {
        return true;
    }

    return MARKDOWN_SANITIZER_ALLOWED_PROTOCOLS.has(schemeMatch[1]!.toLowerCase());
}

/**
 * Applies the shared post-attribute sanitization rules to a DOMPurify instance.
 *
 * @private utility of `renderMarkdown`
 */
function registerMarkdownSanitizerHooks(markdownSanitizer: DomPurifyInstance): void {
    markdownSanitizer.addHook(
        'uponSanitizeAttribute',
        (_currentNode: Element, hookEvent: DomPurifyUponSanitizeAttributeHookEvent) => {
            if (MARKDOWN_SANITIZER_ALLOWED_DATA_ATTRIBUTES.has(hookEvent.attrName)) {
                hookEvent.forceKeepAttr = true;
            }
        },
    );

    markdownSanitizer.addHook('afterSanitizeAttributes', (currentNode: Node) => {
        if (!currentNode || currentNode.nodeType !== 1) {
            return;
        }

        const currentElement = currentNode as Element;

        for (const attributeName of MARKDOWN_SANITIZER_URL_ATTRIBUTES) {
            const attributeValue = currentElement.getAttribute(attributeName);

            if (attributeValue && !isAllowedSanitizedUrl(attributeValue)) {
                currentElement.removeAttribute(attributeName);
            }
        }

        if (currentElement.tagName === 'A' && currentElement.getAttribute('target') === '_blank') {
            currentElement.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

/**
 * Creates a DOMPurify instance configured for Promptbook markdown output.
 *
 * @private utility of `renderMarkdown`
 */
function createMarkdownSanitizer(sanitizerWindow: DomPurifyWindowLike): DomPurifyInstance {
    const markdownSanitizer = createDOMPurify(sanitizerWindow);

    registerMarkdownSanitizerHooks(markdownSanitizer);

    return markdownSanitizer;
}

/**
 * Lazily creates the JSDOM window used by server-side markdown sanitization.
 *
 * @private utility of `renderMarkdown`
 */
function getServerMarkdownSanitizerWindow(): DomPurifyWindowLike {
    if (!serverMarkdownSanitizerWindow) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { JSDOM } = require('jsdom') as typeof import('jsdom');
        serverMarkdownSanitizerWindow = new JSDOM('').window as unknown as DomPurifyWindowLike;
    }

    return serverMarkdownSanitizerWindow;
}

/**
 * Returns the shared DOMPurify instance appropriate for the current runtime.
 *
 * @private utility of `renderMarkdown`
 */
function getMarkdownSanitizer(): DomPurifyInstance {
    if (typeof window !== 'undefined') {
        browserMarkdownSanitizer ??= createMarkdownSanitizer(window as unknown as DomPurifyWindowLike);

        return browserMarkdownSanitizer;
    }

    serverMarkdownSanitizer ??= createMarkdownSanitizer(getServerMarkdownSanitizerWindow());

    return serverMarkdownSanitizer;
}

/**
 * Sanitizes rendered markdown HTML with the shared Promptbook allowlist.
 *
 * @private utility of `renderMarkdown`
 */
function sanitizeRenderedMarkdownHtml(html: string_html): string_html {
    return getMarkdownSanitizer().sanitize(html, MARKDOWN_SANITIZER_CONFIG) as string_html;
}

/**
 * Normalizes markdown sublists so they render correctly under ordered list items.
 *
 * @param markdown - Markdown content to normalize.
 * @returns Markdown with normalized sublist indentation.
 *
 * @private utility of `renderMarkdown`
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
 * @private utility of `renderMarkdown`
 */
function createChatMarkdownConverter(options?: RenderMarkdownOptions): ShowdownConverter {
    const citationReferenceClassName = options?.citationReferenceClassName ?? DEFAULT_CITATION_REFERENCE_CLASS_NAME;

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

                    return `<sup class="${citationReferenceClassName}">[${citationMarker.id}]</sup>`;
                },
            }),
        ],
    });
}

/**
 * Pre-configured showdown converter for chat markdown.
 */
const CHAT_MARKDOWN_CONVERTER = createChatMarkdownConverter();

/**
 * Renders the body of one raw `<details>` block as markdown while keeping the
 * outer `<details>` and optional `<summary>` markup untouched.
 *
 * @param detailsBlock - Raw `<details>...</details>` HTML captured from markdown.
 * @returns `<details>` HTML whose body has been converted from markdown to HTML.
 *
 * @private utility of `renderMarkdown`
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
 * @private utility of `renderMarkdown`
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
 * Masks `<details>...</details>` blocks in the markdown source so that Showdown never
 * processes their content.
 *
 * @param markdown - Markdown text that may contain raw HTML `<details>` blocks.
 * @returns Masked markdown and a restore helper that returns `string_html`.
 *
 * @private utility of `renderMarkdown`
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
 * Replaces math delimiter.
 *
 * @private utility of `renderMarkdown`
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
 * Supported delimiters: `$$...$$`, `\[...\]`, `\(...\)`, and `$...$`.
 *
 * @private utility of `renderMarkdown`
 */
function renderMathInMarkdown(markdown: string): string {
    const { masked, restore } = maskMarkdownCodeSegments(markdown);
    let processed = masked;

    for (const delimiter of MATH_DELIMITER_DEFINITIONS) {
        processed = replaceMathDelimiter(processed, delimiter);
    }
    processed = processed.replace(/\\$/g, '$');
    return restore(processed);
}

/**
 * Escapes HTML-sensitive text before returning fallback markdown rendering.
 *
 * @private utility of `renderMarkdown`
 */
function escapeHtml(value: string): string_html {
    return value.replace(/[<>&"']/g, (char) => {
        const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return entities[char] || char;
    }) as string_html;
}

/**
 * Loads KaTeX CSS in browser environments that need to display math output.
 *
 * @private utility of `renderMarkdown`
 */
function registerKatexStylesheet(html: string_html): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (!html.match(/class="katex/)) {
        return;
    }

    if (window.document.getElementById(KATEX_STYLESHEET_ID)) {
        return;
    }

    const link = window.document.createElement('link');
    link.id = KATEX_STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = KATEX_STYLESHEET_URL;
    window.document.head.appendChild(link);
}

/**
 * Convert markdown content to HTML.
 *
 * @param markdown - The markdown content to convert.
 * @returns HTML string ready for rendering.
 *
 * @private internal utility of chat components and exports
 */
export function renderMarkdown(markdown: string_markdown, options?: RenderMarkdownOptions): string_html {
    if (!markdown || typeof markdown !== 'string') {
        return '' as string_html;
    }

    const converter = options ? createChatMarkdownConverter(options) : CHAT_MARKDOWN_CONVERTER;

    try {
        const normalizedMarkdown = normalizeMarkdownSublists(markdown);
        const { masked: maskedMarkdown, restore: restoreDetails } = maskDetailsBlocks(normalizedMarkdown);
        const processedMarkdown = renderMathInMarkdown(maskedMarkdown);
        const html = converter.makeHtml(processedMarkdown) as string_html;

        registerKatexStylesheet(html);

        const restoredHtml = restoreDetails(html);
        const sanitizedHtml = sanitizeRenderedMarkdownHtml(restoredHtml);

        return sanitizedHtml;
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return escapeHtml(markdown);
    }
}

/**
 * Detects whether text appears to contain markdown syntax.
 *
 * @param markdown - The text to inspect.
 * @returns Whether the text contains known markdown markers.
 *
 * @private internal utility of chat components and exports
 */
export function isMarkdownContent(markdown: string_markdown): boolean {
    if (!markdown || typeof markdown !== 'string') {
        return false;
    }

    return MARKDOWN_CONTENT_PATTERNS.some((pattern) => pattern.test(markdown));
}
