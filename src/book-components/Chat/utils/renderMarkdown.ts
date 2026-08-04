import createDOMPurify, {
    type Config as DomPurifyConfig,
    type DOMPurify as DomPurifyInstance,
    type UponSanitizeAttributeHookEvent as DomPurifyUponSanitizeAttributeHookEvent,
    type WindowLike as DomPurifyWindowLike,
} from 'dompurify';
import katex from 'katex';
import type { Converter as ShowdownConverter } from 'showdown';
import showdown from 'showdown';
import type { string_html, string_markdown } from '../../../types/string_markdown';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { $provideServerDomWindow } from './$provideServerDomWindow';
import { createCitationMarkerRegex, parseCitationMarker } from './parseCitationMarker';

/**
 * Default class name used for rendered citation references outside of CSS modules.
 */
const DEFAULT_CITATION_REFERENCE_CLASS_NAME = 'citationRef';

/**
 * Default class name used for rendered inline reference chips outside of CSS modules.
 */
const DEFAULT_INLINE_REFERENCE_CLASS_NAME = 'inlineReferenceChip';

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
 * Attribute marking a new-tab action generated for an inline-reference menu.
 *
 * @private utility of `renderMarkdown`
 */
const INLINE_REFERENCE_MENU_OPTION_MARKER_ATTRIBUTE = 'data-promptbook-inline-reference-menu-option';

/**
 * Internal `data-*` attributes that Promptbook injects into rendered markdown and must survive sanitization.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_ALLOWED_DATA_ATTRIBUTES = new Set([
    'data-citation-footnote',
    'data-chat-progress-marker',
    INLINE_REFERENCE_MENU_OPTION_MARKER_ATTRIBUTE,
]);

/**
 * Link target that remains safe to preserve in sanitized markdown.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_NEW_TAB_TARGET = '_blank';

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
 * Pattern matching inline `[[reference]]` chips in markdown text.
 *
 * @private utility of `renderMarkdown`
 */
const INLINE_REFERENCE_REGEX = /\[\[([^\]\r\n]+?)\]\]/g;

/**
 * Pattern matching ordinary markdown links that can be promoted to inline reference chips.
 *
 * Images are intentionally captured separately and left unchanged by the replacement helper.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_INLINE_REFERENCE_LINK_REGEX =
    /(!?)\[([^\]\r\n]*)\]\(\s*(<[^>\r\n]+>|[^)\s]+)(?:\s+(?:"[^"\r\n]*"|'[^'\r\n]*'|\([^)]*\)))?\s*\)/g;

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
    readonly inlineReferences?: ReadonlyArray<MarkdownInlineReference>;
    readonly inlineReferenceClassName?: string;
};

/**
 * One inline markdown reference converted from `[[reference]]` into a safe link chip.
 *
 * @public exported from `@promptbook/components`
 */
export type MarkdownInlineReference = {
    /**
     * Raw reference text between `[[` and `]]`.
     */
    readonly reference: string;

    /**
     * Human-readable label rendered inside the link chip.
     */
    readonly label: string;

    /**
     * Link target for the rendered reference.
     */
    readonly href: string;

    /**
     * Markdown link destination prefixes that should render as this reference as well.
     *
     * This supports legacy links such as an Agents Server project file URL while keeping
     * `reference` as the canonical `[[project]]` token.
     */
    readonly sourceHrefPrefixes?: ReadonlyArray<string>;

    /**
     * Optional hover title for the rendered reference.
     */
    readonly title?: string;

    /**
     * Optional expandable menu shown when the reference chip is clicked.
     */
    readonly menu?: MarkdownInlineReferenceMenu;
};

/**
 * Status displayed alongside an expandable markdown inline reference.
 *
 * @public exported from `@promptbook/components`
 */
export type MarkdownInlineReferenceMenuStatus = {
    /**
     * Accessible text describing the current reference status.
     */
    readonly label: string;

    /**
     * Whether the status should be rendered as active.
     */
    readonly isActive: boolean;
};

/**
 * One destination in an expandable markdown inline reference menu.
 *
 * @public exported from `@promptbook/components`
 */
export type MarkdownInlineReferenceMenuOption = {
    /**
     * Text rendered for the option.
     */
    readonly label: string;

    /**
     * New-tab destination, or `null` while the option is unavailable.
     */
    readonly href: string | null;

    /**
     * Optional hover text for the option.
     */
    readonly title?: string;
};

/**
 * Expandable menu configuration for a markdown inline reference.
 *
 * @public exported from `@promptbook/components`
 */
export type MarkdownInlineReferenceMenu = {
    /**
     * Current reference status shown in the chip and menu.
     */
    readonly status: MarkdownInlineReferenceMenuStatus;

    /**
     * New-tab actions listed in the expanded menu.
     */
    readonly options: ReadonlyArray<MarkdownInlineReferenceMenuOption>;
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
        (currentNode: Element, hookEvent: DomPurifyUponSanitizeAttributeHookEvent) => {
            if (MARKDOWN_SANITIZER_ALLOWED_DATA_ATTRIBUTES.has(hookEvent.attrName)) {
                hookEvent.forceKeepAttr = true;
            }

            if (
                hookEvent.attrName === 'target' &&
                hookEvent.attrValue === MARKDOWN_SANITIZER_NEW_TAB_TARGET &&
                currentNode.hasAttribute(INLINE_REFERENCE_MENU_OPTION_MARKER_ATTRIBUTE)
            ) {
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

        if (
            currentElement.tagName === 'A' &&
            currentElement.getAttribute('target') === MARKDOWN_SANITIZER_NEW_TAB_TARGET
        ) {
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
 * Returns the shared DOMPurify instance appropriate for the current runtime.
 *
 * @private utility of `renderMarkdown`
 */
function getMarkdownSanitizer(): DomPurifyInstance {
    if (typeof window !== 'undefined') {
        browserMarkdownSanitizer ??= createMarkdownSanitizer(window as unknown as DomPurifyWindowLike);

        return browserMarkdownSanitizer;
    }

    serverMarkdownSanitizer ??= createMarkdownSanitizer($provideServerDomWindow());

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

    return new showdown.Converter({
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
 * @param options - Markdown rendering options to reuse for the details body.
 * @returns `<details>` HTML whose body has been converted from markdown to HTML.
 *
 * @private utility of `renderMarkdown`
 */
function renderDetailsBlock(detailsBlock: string, options?: RenderMarkdownOptions): string_html {
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
    const renderedBody = renderMarkdown(bodyMarkdown, options);

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
 * @param options - Markdown rendering options to reuse for the details body.
 * @returns Masked markdown and a restore helper that returns `string_html`.
 *
 * @private utility of `renderMarkdown`
 */
function maskDetailsBlocks(markdown: string_markdown, options?: RenderMarkdownOptions): MaskedDetailsBlocksResult {
    const blocks: string_html[] = [];

    DETAILS_BLOCK_REGEX.lastIndex = 0;
    const masked = markdown.replace(DETAILS_BLOCK_REGEX, (match) => {
        const placeholder = `${DETAILS_PLACEHOLDER_PREFIX}${blocks.length}__`;
        blocks.push(renderDetailsBlock(match, options));
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
 * Normalizes inline reference keys for stable matching.
 *
 * @param value - Raw reference key.
 * @returns Trimmed case-insensitive key.
 *
 * @private utility of `renderMarkdown`
 */
function normalizeMarkdownInlineReferenceKey(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Builds a lookup of inline markdown references keyed by the authored `[[reference]]` text.
 *
 * @param references - References available to this markdown render.
 * @returns Reference lookup map.
 *
 * @private utility of `renderMarkdown`
 */
function createMarkdownInlineReferenceByKey(
    references: ReadonlyArray<MarkdownInlineReference>,
): Map<string, MarkdownInlineReference> {
    const referenceByKey = new Map<string, MarkdownInlineReference>();

    for (const reference of references) {
        const normalizedReference = normalizeMarkdownInlineReferenceKey(reference.reference);
        if (!normalizedReference || referenceByKey.has(normalizedReference)) {
            continue;
        }

        referenceByKey.set(normalizedReference, reference);
    }

    return referenceByKey;
}

/**
 * Returns whether a href starts with a configured source href prefix.
 *
 * @param href - Markdown link destination.
 * @param sourceHrefPrefix - Configured source href prefix.
 * @returns Whether the href belongs to the source prefix.
 *
 * @private utility of `renderMarkdown`
 */
function doesHrefStartWithSourceHrefPrefix(href: string, sourceHrefPrefix: string): boolean {
    if (href === sourceHrefPrefix) {
        return true;
    }

    const normalizedSourceHrefPrefix = sourceHrefPrefix.endsWith('/') ? sourceHrefPrefix : `${sourceHrefPrefix}/`;

    return href.startsWith(normalizedSourceHrefPrefix);
}

/**
 * Returns a comparable path for an absolute href when the configured source prefix is relative.
 *
 * @param href - Href to normalize.
 * @returns Absolute URL pathname or the original href when it is relative/invalid.
 *
 * @private utility of `renderMarkdown`
 */
function resolveAbsoluteHrefPath(href: string): string {
    try {
        return new URL(href).pathname;
    } catch {
        return href;
    }
}

/**
 * Returns whether one markdown link destination belongs to one inline reference.
 *
 * Relative project paths also match absolute URLs on the current server, which keeps
 * server-generated relative links and model-generated absolute links consistent.
 *
 * @param reference - Candidate inline reference.
 * @param href - Markdown link destination.
 * @returns Whether the href should render as the reference chip.
 *
 * @private utility of `renderMarkdown`
 */
function doesMarkdownInlineReferenceMatchHref(reference: MarkdownInlineReference, href: string): boolean {
    const normalizedHref = href.trim();

    return (reference.sourceHrefPrefixes || []).some((sourceHrefPrefix) => {
        const normalizedSourceHrefPrefix = sourceHrefPrefix.trim();
        if (!normalizedSourceHrefPrefix) {
            return false;
        }

        if (doesHrefStartWithSourceHrefPrefix(normalizedHref, normalizedSourceHrefPrefix)) {
            return true;
        }

        const isRelativeSourceHrefPrefix = !/^[a-z][a-z0-9+.-]*:/i.test(normalizedSourceHrefPrefix);
        const isAbsoluteHref = /^[a-z][a-z0-9+.-]*:/i.test(normalizedHref);

        return (
            isRelativeSourceHrefPrefix &&
            isAbsoluteHref &&
            doesHrefStartWithSourceHrefPrefix(resolveAbsoluteHrefPath(normalizedHref), normalizedSourceHrefPrefix)
        );
    });
}

/**
 * Finds the inline reference represented by a markdown link destination.
 *
 * @param references - Inline references available to the markdown renderer.
 * @param href - Markdown link destination.
 * @returns Matching reference or `undefined` when the href is unrelated.
 *
 * @private utility of `renderMarkdown`
 */
function findMarkdownInlineReferenceByHref(
    references: ReadonlyArray<MarkdownInlineReference>,
    href: string,
): MarkdownInlineReference | undefined {
    return references.find((reference) => doesMarkdownInlineReferenceMatchHref(reference, href));
}

/**
 * Renders one inline reference as raw HTML that is sanitized by the shared markdown sanitizer.
 *
 * @param reference - Resolved inline reference.
 * @param className - CSS class applied to the generated link.
 * @returns HTML anchor markup.
 *
 * @private utility of `renderMarkdown`
 */
function renderMarkdownInlineReferenceHtml(reference: MarkdownInlineReference, className: string): string {
    if (reference.menu) {
        return renderMarkdownInlineReferenceMenuHtml(reference, className);
    }

    const escapedClassName = escapeHtml(className);
    const escapedHref = escapeHtml(reference.href);
    const escapedLabel = escapeHtml(reference.label);
    const escapedTitle = escapeHtml(reference.title || reference.label);

    return `<a class="${escapedClassName}" href="${escapedHref}" title="${escapedTitle}">${escapedLabel}</a>`;
}

/**
 * Renders one inline reference with an expandable menu as raw HTML sanitized by the markdown sanitizer.
 *
 * @param reference - Resolved inline reference with menu data.
 * @param className - CSS class applied to the generated reference chip.
 * @returns HTML details markup.
 *
 * @private utility of `renderMarkdown`
 */
function renderMarkdownInlineReferenceMenuHtml(reference: MarkdownInlineReference, className: string): string {
    const menu = reference.menu;

    if (!menu) {
        return renderMarkdownInlineReferenceHtml({ ...reference, menu: undefined }, className);
    }

    const escapedClassName = escapeHtml(className);
    const escapedLabel = escapeHtml(reference.label);
    const escapedTitle = escapeHtml(reference.title || reference.label);
    const escapedStatusLabel = escapeHtml(menu.status.label);
    const statusClassName = menu.status.isActive
        ? 'inlineReferenceMenuStatus inlineReferenceMenuStatus--active'
        : 'inlineReferenceMenuStatus';
    const optionsHtml = menu.options.map((option) => renderMarkdownInlineReferenceMenuOptionHtml(option)).join('');

    return `<details class="${escapedClassName}" title="${escapedTitle}"><summary><span>${escapedLabel}</span><span class="${statusClassName}" title="${escapedStatusLabel}"></span></summary><div><span class="${statusClassName}">${escapedStatusLabel}</span>${optionsHtml}</div></details>`;
}

/**
 * Renders one option in an expandable markdown inline reference menu.
 *
 * @param option - Menu option definition.
 * @returns HTML anchor or disabled label markup.
 *
 * @private utility of `renderMarkdown`
 */
function renderMarkdownInlineReferenceMenuOptionHtml(option: MarkdownInlineReferenceMenuOption): string {
    const escapedLabel = escapeHtml(option.label);
    const escapedTitle = escapeHtml(option.title || option.label);

    if (option.href === null) {
        return `<span class="inlineReferenceMenuOption inlineReferenceMenuOption--disabled" title="${escapedTitle}">${escapedLabel}</span>`;
    }

    const escapedHref = escapeHtml(option.href);
    return `<a ${INLINE_REFERENCE_MENU_OPTION_MARKER_ATTRIBUTE} class="inlineReferenceMenuOption" href="${escapedHref}" title="${escapedTitle}" target="${MARKDOWN_SANITIZER_NEW_TAB_TARGET}" rel="noopener noreferrer">${escapedLabel}</a>`;
}

/**
 * Replaces known `[[reference]]` tokens with link chips while leaving unknown tokens unchanged.
 *
 * @param markdown - Markdown content after code masking.
 * @param options - Markdown render options.
 * @returns Markdown with known inline references rendered as HTML anchors.
 *
 * @private utility of `renderMarkdown`
 */
function applyMarkdownInlineReferences(markdown: string_markdown, options?: RenderMarkdownOptions): string_markdown {
    const references = options?.inlineReferences;
    const className = options?.inlineReferenceClassName || DEFAULT_INLINE_REFERENCE_CLASS_NAME;

    if (!references || references.length === 0) {
        return markdown;
    }

    const referenceByKey = createMarkdownInlineReferenceByKey(references);
    if (referenceByKey.size === 0) {
        return markdown;
    }

    const markdownWithInlineReferenceTokens = markdown.replace(
        INLINE_REFERENCE_REGEX,
        (match, rawReference: string) => {
            const reference = referenceByKey.get(normalizeMarkdownInlineReferenceKey(rawReference));

            return reference ? renderMarkdownInlineReferenceHtml(reference, className) : match;
        },
    );

    return markdownWithInlineReferenceTokens.replace(
        MARKDOWN_INLINE_REFERENCE_LINK_REGEX,
        (match, imageMarker: string, _linkLabel: string, rawHref: string) => {
            if (imageMarker) {
                return match;
            }

            const href = rawHref.replace(/^<|>$/g, '');
            const reference = findMarkdownInlineReferenceByHref(references, href);

            return reference ? renderMarkdownInlineReferenceHtml(reference, className) : match;
        },
    ) as string_markdown;
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
        const { masked: maskedMarkdown, restore: restoreDetails } = maskDetailsBlocks(normalizedMarkdown, options);
        const { masked: codeMaskedMarkdown, restore: restoreCode } = maskMarkdownCodeSegments(maskedMarkdown);
        const referencedMarkdown = applyMarkdownInlineReferences(codeMaskedMarkdown, options);
        const inlineReferenceMarkdown = restoreCode(referencedMarkdown);
        const processedMarkdown = renderMathInMarkdown(inlineReferenceMarkdown);
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
