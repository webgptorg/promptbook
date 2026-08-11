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
    'button',
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
 * Attribute marking a client action generated for an inline-reference menu.
 *
 * @private utility shared with `MarkdownContent`
 */
export const MARKDOWN_INLINE_REFERENCE_MENU_ACTION_ATTRIBUTE =
    'data-promptbook-inline-reference-menu-action';

/**
 * Attribute identifying the inline reference which owns a client menu action.
 *
 * @private utility shared with `MarkdownContent`
 */
export const MARKDOWN_INLINE_REFERENCE_MENU_ACTION_REFERENCE_ATTRIBUTE =
    'data-promptbook-inline-reference-menu-action-reference';

/**
 * Attribute marking a favicon rendered inside an inline-reference chip.
 *
 * @private utility shared with `MarkdownContent`
 */
export const MARKDOWN_INLINE_REFERENCE_ICON_ATTRIBUTE = 'data-promptbook-inline-reference-icon';

/**
 * Internal `data-*` attributes that Promptbook injects into rendered markdown and must survive sanitization.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_SANITIZER_ALLOWED_DATA_ATTRIBUTES = new Set([
    'data-citation-footnote',
    'data-chat-progress-marker',
    INLINE_REFERENCE_MENU_OPTION_MARKER_ATTRIBUTE,
    MARKDOWN_INLINE_REFERENCE_MENU_ACTION_ATTRIBUTE,
    MARKDOWN_INLINE_REFERENCE_MENU_ACTION_REFERENCE_ATTRIBUTE,
    MARKDOWN_INLINE_REFERENCE_ICON_ATTRIBUTE,
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
 * Prefix for INLINE REFERENCE PLACEHOLDER.
 *
 * @private utility of `renderMarkdown`
 */
const INLINE_REFERENCE_PLACEHOLDER_PREFIX = '@@PROMPTBOOK_INLINE_REFERENCE_PLACEHOLDER__';

/**
 * Pattern matching INLINE REFERENCE PLACEHOLDER.
 *
 * @private utility of `renderMarkdown`
 */
const INLINE_REFERENCE_PLACEHOLDER_REGEX = new RegExp(`${INLINE_REFERENCE_PLACEHOLDER_PREFIX}(\\d+)__`, 'g');

/**
 * Prefix for markdown text-segment placeholders used while resolving plain-text inline-reference aliases.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_REFERENCE_TEXT_MASK_PLACEHOLDER_PREFIX = '@@PROMPTBOOK_MARKDOWN_REFERENCE_TEXT_MASK_PLACEHOLDER__';

/**
 * Pattern matching markdown text-segment placeholders.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_REFERENCE_TEXT_MASK_PLACEHOLDER_REGEX = new RegExp(
    `${MARKDOWN_REFERENCE_TEXT_MASK_PLACEHOLDER_PREFIX}(\\d+)__`,
    'g',
);

/**
 * Pattern matching markdown links and images together with their raw target.
 *
 * @private utility of `renderMarkdown`
 */
const MARKDOWN_LINK_REGEX = /(!?)\[([^\]\r\n]*)\]\(\s*(<[^>\r\n]*>|[^()\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

/**
 * Pattern matching bare `http(s)` URLs written directly into markdown text.
 *
 * @private utility of `renderMarkdown`
 */
const BARE_URL_REGEX = /(^|\s)(https?:\/\/[^\s<>()[\]"']+)/g;

/**
 * Sentence punctuation which trails a bare URL instead of belonging to it.
 *
 * @private utility of `renderMarkdown`
 */
const BARE_URL_TRAILING_PUNCTUATION_REGEX = /[.,;:!?]+$/;

/**
 * Pattern splitting one URL into its scheme, host and remaining part.
 *
 * @private utility of `renderMarkdown`
 */
const ABSOLUTE_URL_REGEX = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)(.*)$/i;

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
     * Optional text aliases which should render as this reference when an agent mentions them in markdown.
     *
     * They are also accepted inside a `[[reference]]` token. This lets application code use a stable
     * technical reference while recognizing a human-facing name in older messages.
     */
    readonly sourceTextAliases?: ReadonlyArray<string>;

    /**
     * Human-readable label rendered inside the link chip.
     */
    readonly label: string;

    /**
     * Link target for the rendered reference.
     */
    readonly href: string;

    /**
     * Optional URL prefixes which also identify this reference in the authored markdown.
     *
     * A markdown link or a bare URL pointing to one of these prefixes is rendered as the same chip
     * as the `[[reference]]` token. Both absolute URLs (for example `https://project.example.com`)
     * and application paths (for example `/agents/agent/projects/website`) are supported; a path
     * prefix matches on any host so that both relative and absolute links are recognized.
     */
    readonly sourceHrefPrefixes?: ReadonlyArray<string>;

    /**
     * Optional hover title for the rendered reference.
     */
    readonly title?: string;

    /**
     * Optional favicon and text fallback rendered before the reference label.
     */
    readonly icon?: MarkdownInlineReferenceIcon;

    /**
     * Optional expandable menu shown when the reference chip is clicked.
     */
    readonly menu?: MarkdownInlineReferenceMenu;
};

/**
 * Visual identity rendered inside one markdown inline-reference chip.
 *
 * @public exported from `@promptbook/components`
 */
export type MarkdownInlineReferenceIcon = {
    /**
     * Optional image URL. The fallback remains visible when the image is unavailable.
     */
    readonly src?: string | null;

    /**
     * Short text rendered when the image is missing or broken.
     */
    readonly fallbackText: string;
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

    /**
     * Optional client action rendered as a button instead of a link.
     */
    readonly action?: MarkdownInlineReferenceMenuAction;
};

/**
 * Client-side action exposed by an expandable markdown inline-reference menu.
 *
 * @public exported from `@promptbook/components`
 */
export type MarkdownInlineReferenceMenuAction = {
    /**
     * Stable identifier unique within the owning reference menu.
     */
    readonly id: string;

    /**
     * Callback invoked when the menu button is selected.
     */
    readonly onSelect: () => void | Promise<void>;
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
 * Result of temporarily masked markdown links, images and bare URLs.
 */
type MaskedMarkdownLinkAndUrlSegmentsResult = {
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
 * Masks markdown links, images and bare URLs while plain-text reference aliases are resolved.
 *
 * A matching display name inside an unrelated link label must keep that original link instead of
 * producing a nested chip inside its anchor.
 *
 * @param markdown - Markdown without code segments.
 * @returns Masked markdown and a restore helper.
 *
 * @private utility of `renderMarkdown`
 */
function maskMarkdownLinksAndBareUrls(markdown: string_markdown): MaskedMarkdownLinkAndUrlSegmentsResult {
    const segments: string[] = [];
    const addPlaceholder = (segment: string): string => {
        const placeholder = `${MARKDOWN_REFERENCE_TEXT_MASK_PLACEHOLDER_PREFIX}${segments.length}__`;
        segments.push(segment);
        return placeholder;
    };

    MARKDOWN_LINK_REGEX.lastIndex = 0;
    let masked = markdown.replace(MARKDOWN_LINK_REGEX, (match) => addPlaceholder(match)) as string_markdown;

    BARE_URL_REGEX.lastIndex = 0;
    masked = masked.replace(BARE_URL_REGEX, (_match, leadingWhitespace: string, rawUrl: string) => {
        return `${leadingWhitespace}${addPlaceholder(rawUrl)}`;
    }) as string_markdown;

    return {
        masked,
        restore(value: string_markdown): string_markdown {
            return value.replace(
                MARKDOWN_REFERENCE_TEXT_MASK_PLACEHOLDER_REGEX,
                (_match, index) => segments[Number(index)] ?? '',
            );
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
 * Lists all token keys which can identify one inline reference.
 *
 * @param reference - Inline reference with its stable key and optional display-name aliases.
 * @returns Keys recognized inside `[[...]]` tokens.
 *
 * @private utility of `renderMarkdown`
 */
function listMarkdownInlineReferenceKeys(reference: MarkdownInlineReference): ReadonlyArray<string> {
    return [reference.reference, ...(reference.sourceTextAliases || [])];
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
        for (const referenceKey of listMarkdownInlineReferenceKeys(reference)) {
            const normalizedReference = normalizeMarkdownInlineReferenceKey(referenceKey);
            if (!normalizedReference || referenceByKey.has(normalizedReference)) {
                continue;
            }

            referenceByKey.set(normalizedReference, reference);
        }
    }

    return referenceByKey;
}

/**
 * One display-name alias and the inline reference it renders.
 *
 * @private utility of `renderMarkdown`
 */
type MarkdownInlineReferenceTextMatcher = {
    /**
     * Reference rendered for the alias.
     */
    readonly reference: MarkdownInlineReference;

    /**
     * Human-readable source text recognized in markdown.
     */
    readonly sourceTextAlias: string;
};

/**
 * Escapes text before embedding it into a regular expression.
 *
 * @param value - Literal text to match.
 * @returns Regular-expression-safe text.
 *
 * @private utility of `renderMarkdown`
 */
function escapeRegularExpression(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates non-ambiguous display-name matchers for inline references.
 *
 * Longer aliases are matched first so a project named `Prague Map` wins over a project named `Map`.
 * An alias shared by more than one reference is deliberately ignored instead of linking to an arbitrary project.
 *
 * @param references - References available to this markdown render.
 * @returns Plain-text matchers ordered from longest to shortest alias.
 *
 * @private utility of `renderMarkdown`
 */
function createMarkdownInlineReferenceTextMatchers(
    references: ReadonlyArray<MarkdownInlineReference>,
): ReadonlyArray<MarkdownInlineReferenceTextMatcher> {
    const matcherByNormalizedAlias = new Map<string, MarkdownInlineReferenceTextMatcher | null>();

    for (const reference of references) {
        for (const sourceTextAliasCandidate of reference.sourceTextAliases || []) {
            const sourceTextAlias = sourceTextAliasCandidate.trim();
            const normalizedAlias = normalizeMarkdownInlineReferenceKey(sourceTextAlias);
            if (!normalizedAlias) {
                continue;
            }

            const existingMatcher = matcherByNormalizedAlias.get(normalizedAlias);
            if (existingMatcher === undefined) {
                matcherByNormalizedAlias.set(normalizedAlias, { reference, sourceTextAlias });
            } else if (existingMatcher !== null && existingMatcher.reference !== reference) {
                matcherByNormalizedAlias.set(normalizedAlias, null);
            }
        }
    }

    return Array.from(matcherByNormalizedAlias.values())
        .filter((matcher): matcher is MarkdownInlineReferenceTextMatcher => matcher !== null)
        .sort(
            (firstMatcher, secondMatcher) =>
                secondMatcher.sourceTextAlias.length - firstMatcher.sourceTextAlias.length ||
                firstMatcher.sourceTextAlias.localeCompare(secondMatcher.sourceTextAlias),
        );
}

/**
 * Creates a regular expression matching one plain-text alias with optional bold markdown around it.
 *
 * @param sourceTextAlias - Literal display name to match.
 * @param isMarkdownFormattingMatched - Whether matching `**alias**` and `__alias__` form.
 * @returns Unicode-aware whole-text regular expression.
 *
 * @private utility of `renderMarkdown`
 */
function createMarkdownInlineReferenceTextAliasRegex(
    sourceTextAlias: string,
    isMarkdownFormattingMatched: boolean,
): RegExp {
    const escapedAlias = escapeRegularExpression(sourceTextAlias);
    const boundaryCharacterClass = '\\p{L}\\p{N}_-';
    const boundaryPattern = `[^${boundaryCharacterClass}]`;
    const aliasPattern = isMarkdownFormattingMatched
        ? `(?:\\*\\*|__)${escapedAlias}(?:\\*\\*|__)`
        : escapedAlias;

    return new RegExp(`(^|${boundaryPattern})${aliasPattern}(?=$|${boundaryPattern})`, 'giu');
}

/**
 * Replaces known project display names in agent markdown with inline-reference placeholders.
 *
 * Bold aliases are replaced first so an older message such as `**Prague Murders Map**` becomes one
 * chip rather than a chip nested inside formatting markup.
 *
 * @param markdown - Markdown with code and links already masked.
 * @param matchers - Non-ambiguous display-name aliases available to this render.
 * @param createPlaceholder - Renders a matched reference into a placeholder.
 * @returns Markdown containing inline-reference placeholders.
 *
 * @private utility of `renderMarkdown`
 */
function replaceMarkdownInlineReferenceTextAliases(
    markdown: string_markdown,
    matchers: ReadonlyArray<MarkdownInlineReferenceTextMatcher>,
    createPlaceholder: CreateMarkdownInlineReferencePlaceholder,
): string_markdown {
    let referencedMarkdown = markdown;

    for (const matcher of matchers) {
        for (const isMarkdownFormattingMatched of [true, false]) {
            const aliasRegex = createMarkdownInlineReferenceTextAliasRegex(
                matcher.sourceTextAlias,
                isMarkdownFormattingMatched,
            );
            referencedMarkdown = referencedMarkdown.replace(aliasRegex, (_match, leadingBoundary: string) => {
                return `${leadingBoundary || ''}${createPlaceholder(matcher.reference)}`;
            }) as string_markdown;
        }
    }

    return referencedMarkdown;
}

/**
 * Comparable parts of one URL used to recognize inline references written as links or bare URLs.
 *
 * @private utility of `renderMarkdown`
 */
type ComparableUrlParts = {
    /**
     * Lowercase host of an absolute URL, or an empty string for a host-independent application path.
     */
    readonly host: string;

    /**
     * Lowercase decoded path without query, hash and trailing slashes.
     */
    readonly path: string;
};

/**
 * One inline reference together with its comparable source URL prefixes.
 *
 * @private utility of `renderMarkdown`
 */
type MarkdownInlineReferenceHrefMatcher = {
    /**
     * Reference rendered when one of its source prefixes matches.
     */
    readonly reference: MarkdownInlineReference;

    /**
     * Comparable form of the reference source URL prefixes.
     */
    readonly sourceHrefPrefixes: ReadonlyArray<ComparableUrlParts>;
};

/**
 * Renders one matched reference and returns the placeholder standing for it.
 *
 * @private utility of `renderMarkdown`
 */
type CreateMarkdownInlineReferencePlaceholder = (reference: MarkdownInlineReference) => string;

/**
 * Decodes percent-encoded characters without failing on malformed input.
 *
 * @param value - Raw URL part.
 * @returns Decoded value, or the original value when it cannot be decoded.
 *
 * @private utility of `renderMarkdown`
 */
function decodeUrlPartSafely(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Normalizes one URL path so that encoding, casing and trailing slashes do not break matching.
 *
 * @param path - Raw path including an optional query and hash.
 * @returns Comparable path.
 *
 * @private utility of `renderMarkdown`
 */
function normalizeUrlPathForComparison(path: string): string {
    const pathWithoutQuery = path.split(/[?#]/, 1)[0] || '';

    return decodeUrlPartSafely(pathWithoutQuery).toLowerCase().replace(/\/+$/, '');
}

/**
 * Splits one absolute URL or application path into its comparable parts.
 *
 * @param url - Raw link target written in markdown.
 * @returns Comparable URL parts, or `null` when the value cannot address a reference.
 *
 * @private utility of `renderMarkdown`
 */
function createComparableUrlParts(url: string): ComparableUrlParts | null {
    const trimmedUrl = url
        .trim()
        .replace(/^<([\s\S]*)>$/, '$1')
        .trim();

    if (trimmedUrl === '') {
        return null;
    }

    const absoluteUrlMatch = trimmedUrl.match(ABSOLUTE_URL_REGEX);
    if (absoluteUrlMatch) {
        return {
            host: absoluteUrlMatch[1]!.toLowerCase(),
            path: normalizeUrlPathForComparison(absoluteUrlMatch[2] || ''),
        };
    }

    if (!trimmedUrl.startsWith('/')) {
        return null;
    }

    return {
        host: '',
        path: normalizeUrlPathForComparison(trimmedUrl),
    };
}

/**
 * Returns whether one URL points into one reference source prefix.
 *
 * @param url - Comparable parts of the link target written in markdown.
 * @param prefix - Comparable parts of one reference source prefix.
 * @returns `true` when the URL belongs to the reference.
 *
 * @private utility of `renderMarkdown`
 */
function isUrlWithinReferencePrefix(url: ComparableUrlParts, prefix: ComparableUrlParts): boolean {
    if (prefix.host !== '' && prefix.host !== url.host) {
        return false;
    }

    if (prefix.path === '') {
        // Note: A prefix without a path covers the whole host, a prefix without both would cover everything
        return prefix.host !== '';
    }

    return url.path === prefix.path || url.path.startsWith(`${prefix.path}/`);
}

/**
 * Builds matchers for references which can also be written as a markdown link or a bare URL.
 *
 * @param references - References available to this markdown render.
 * @returns Matchers of references declaring at least one usable source prefix.
 *
 * @private utility of `renderMarkdown`
 */
function createMarkdownInlineReferenceHrefMatchers(
    references: ReadonlyArray<MarkdownInlineReference>,
): ReadonlyArray<MarkdownInlineReferenceHrefMatcher> {
    return references
        .map((reference) => ({
            reference,
            sourceHrefPrefixes: (reference.sourceHrefPrefixes || [])
                .map((sourceHrefPrefix) => createComparableUrlParts(sourceHrefPrefix))
                .filter((sourceHrefPrefix): sourceHrefPrefix is ComparableUrlParts => sourceHrefPrefix !== null),
        }))
        .filter((matcher) => matcher.sourceHrefPrefixes.length !== 0);
}

/**
 * Finds the reference which owns one link target.
 *
 * @param href - Raw link target written in markdown.
 * @param matchers - Reference matchers of this markdown render.
 * @returns Matching reference or `null`.
 *
 * @private utility of `renderMarkdown`
 */
function findMarkdownInlineReferenceForHref(
    href: string,
    matchers: ReadonlyArray<MarkdownInlineReferenceHrefMatcher>,
): MarkdownInlineReference | null {
    const urlParts = createComparableUrlParts(href);

    if (urlParts === null) {
        return null;
    }

    const matcher = matchers.find((candidateMatcher) =>
        candidateMatcher.sourceHrefPrefixes.some((sourceHrefPrefix) =>
            isUrlWithinReferencePrefix(urlParts, sourceHrefPrefix),
        ),
    );

    return matcher?.reference || null;
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

    const escapedClassName = escapeHtml(createMarkdownInlineReferenceClassName(reference, className));
    const escapedHref = escapeHtml(reference.href);
    const escapedLabel = escapeHtml(reference.label);
    const escapedTitle = escapeHtml(reference.title || reference.label);
    const iconHtml = renderMarkdownInlineReferenceIconHtml(reference.icon);

    return `<a class="${escapedClassName}" href="${escapedHref}" title="${escapedTitle}">${iconHtml}<span>${escapedLabel}</span></a>`;
}

/**
 * Adds the icon marker class only to references which provide icon metadata.
 *
 * @param reference - Inline reference being rendered.
 * @param className - Base chip class name.
 * @returns Complete class name for the rendered chip.
 *
 * @private utility of `renderMarkdown`
 */
function createMarkdownInlineReferenceClassName(reference: MarkdownInlineReference, className: string): string {
    return reference.icon ? `${className} inlineReferenceChip--with-icon` : className;
}

/**
 * Renders one inline-reference favicon with a text fallback.
 *
 * @param icon - Optional icon metadata.
 * @returns Safe icon markup, or an empty string when no icon is configured.
 *
 * @private utility of `renderMarkdown`
 */
function renderMarkdownInlineReferenceIconHtml(icon: MarkdownInlineReferenceIcon | undefined): string {
    if (!icon) {
        return '';
    }

    const escapedFallbackText = escapeHtml(icon.fallbackText);
    const fallbackHtml = `<span class="inlineReferenceIconFallback">${escapedFallbackText}</span>`;

    if (!icon.src) {
        return `<span class="inlineReferenceIcon" aria-hidden="true">${fallbackHtml}</span>`;
    }

    const escapedSrc = escapeHtml(icon.src);
    return `<span class="inlineReferenceIcon" aria-hidden="true">${fallbackHtml}<img ${MARKDOWN_INLINE_REFERENCE_ICON_ATTRIBUTE} src="${escapedSrc}" alt=""></span>`;
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

    const escapedClassName = escapeHtml(createMarkdownInlineReferenceClassName(reference, className));
    const escapedLabel = escapeHtml(reference.label);
    const escapedTitle = escapeHtml(reference.title || reference.label);
    const escapedStatusLabel = escapeHtml(menu.status.label);
    const statusClassName = menu.status.isActive
        ? 'inlineReferenceMenuStatus inlineReferenceMenuStatus--active'
        : 'inlineReferenceMenuStatus inlineReferenceMenuStatus--inactive';
    const iconHtml = renderMarkdownInlineReferenceIconHtml(reference.icon);
    const optionsHtml = menu.options
        .map((option) => renderMarkdownInlineReferenceMenuOptionHtml(reference, option))
        .join('');

    return `<details class="${escapedClassName}" title="${escapedTitle}"><summary>${iconHtml}<span>${escapedLabel}</span><span class="${statusClassName}" title="${escapedStatusLabel}"></span></summary><div><span class="${statusClassName}">${escapedStatusLabel}</span>${optionsHtml}</div></details>`;
}

/**
 * Renders one option in an expandable markdown inline reference menu.
 *
 * @param reference - Inline reference which owns the option.
 * @param option - Menu option definition.
 * @returns HTML anchor or disabled label markup.
 *
 * @private utility of `renderMarkdown`
 */
function renderMarkdownInlineReferenceMenuOptionHtml(
    reference: MarkdownInlineReference,
    option: MarkdownInlineReferenceMenuOption,
): string {
    const escapedLabel = escapeHtml(option.label);
    const escapedTitle = escapeHtml(option.title || option.label);

    if (option.action) {
        const escapedActionId = escapeHtml(option.action.id);
        const escapedReference = escapeHtml(reference.reference);

        return `<button type="button" ${MARKDOWN_INLINE_REFERENCE_MENU_ACTION_ATTRIBUTE}="${escapedActionId}" ${MARKDOWN_INLINE_REFERENCE_MENU_ACTION_REFERENCE_ATTRIBUTE}="${escapedReference}" class="inlineReferenceMenuOption" title="${escapedTitle}">${escapedLabel}</button>`;
    }

    if (option.href === null) {
        return `<span class="inlineReferenceMenuOption inlineReferenceMenuOption--disabled" title="${escapedTitle}">${escapedLabel}</span>`;
    }

    const escapedHref = escapeHtml(option.href);
    return `<a ${INLINE_REFERENCE_MENU_OPTION_MARKER_ATTRIBUTE} class="inlineReferenceMenuOption" href="${escapedHref}" title="${escapedTitle}" target="${MARKDOWN_SANITIZER_NEW_TAB_TARGET}" rel="noopener noreferrer">${escapedLabel}</a>`;
}

/**
 * Replaces known `[[reference]]` tokens with chip placeholders while leaving unknown tokens unchanged.
 *
 * @param markdown - Markdown content after code masking.
 * @param references - References available to this markdown render.
 * @param createPlaceholder - Renders one matched reference into a placeholder.
 * @returns Markdown with known reference tokens replaced by placeholders.
 *
 * @private utility of `renderMarkdown`
 */
function replaceMarkdownInlineReferenceTokens(
    markdown: string_markdown,
    references: ReadonlyArray<MarkdownInlineReference>,
    createPlaceholder: CreateMarkdownInlineReferencePlaceholder,
): string_markdown {
    const referenceByKey = createMarkdownInlineReferenceByKey(references);

    if (referenceByKey.size === 0) {
        return markdown;
    }

    return markdown.replace(INLINE_REFERENCE_REGEX, (match, rawReference: string) => {
        const reference = referenceByKey.get(normalizeMarkdownInlineReferenceKey(rawReference));

        return reference ? createPlaceholder(reference) : match;
    }) as string_markdown;
}

/**
 * Replaces markdown links pointing to a known reference with chip placeholders.
 *
 * Images keep their original markdown so that pictures served by a reference stay visible.
 *
 * @param markdown - Markdown content after code masking.
 * @param matchers - Reference matchers of this markdown render.
 * @param createPlaceholder - Renders one matched reference into a placeholder.
 * @returns Markdown with known reference links replaced by placeholders.
 *
 * @private utility of `renderMarkdown`
 */
function replaceMarkdownInlineReferenceLinks(
    markdown: string_markdown,
    matchers: ReadonlyArray<MarkdownInlineReferenceHrefMatcher>,
    createPlaceholder: CreateMarkdownInlineReferencePlaceholder,
): string_markdown {
    return markdown.replace(MARKDOWN_LINK_REGEX, (match, imageMarker: string, _label: string, rawHref: string) => {
        if (imageMarker !== '') {
            return match;
        }

        const reference = findMarkdownInlineReferenceForHref(rawHref, matchers);

        return reference ? createPlaceholder(reference) : match;
    }) as string_markdown;
}

/**
 * Replaces bare URLs of known references with chip placeholders.
 *
 * @param markdown - Markdown content after reference links were replaced.
 * @param matchers - Reference matchers of this markdown render.
 * @param createPlaceholder - Renders one matched reference into a placeholder.
 * @returns Markdown with known reference URLs replaced by placeholders.
 *
 * @private utility of `renderMarkdown`
 */
function replaceMarkdownInlineReferenceBareUrls(
    markdown: string_markdown,
    matchers: ReadonlyArray<MarkdownInlineReferenceHrefMatcher>,
    createPlaceholder: CreateMarkdownInlineReferencePlaceholder,
): string_markdown {
    return markdown.replace(BARE_URL_REGEX, (match, leadingWhitespace: string, rawUrl: string) => {
        const trailingPunctuation = rawUrl.match(BARE_URL_TRAILING_PUNCTUATION_REGEX)?.[0] || '';
        const url = rawUrl.slice(0, rawUrl.length - trailingPunctuation.length);
        const reference = findMarkdownInlineReferenceForHref(url, matchers);

        return reference ? `${leadingWhitespace}${createPlaceholder(reference)}${trailingPunctuation}` : match;
    }) as string_markdown;
}

/**
 * Restores chips which replaced references during the reference passes.
 *
 * @param markdown - Markdown containing reference placeholders.
 * @param renderedChips - Chip HTML indexed by placeholder number.
 * @returns Markdown with inline references rendered as HTML chips.
 *
 * @private utility of `renderMarkdown`
 */
function restoreMarkdownInlineReferenceChips(
    markdown: string_markdown,
    renderedChips: ReadonlyArray<string>,
): string_markdown {
    return markdown.replace(
        INLINE_REFERENCE_PLACEHOLDER_REGEX,
        (_match, index) => renderedChips[Number(index)] ?? '',
    ) as string_markdown;
}

/**
 * Replaces known `[[reference]]` tokens, reference links and bare reference URLs with link chips.
 *
 * Every matched reference is first replaced by a placeholder so that the rendered chip HTML is
 * never processed again by a later pass.
 *
 * @param markdown - Markdown content after code masking.
 * @param options - Markdown render options.
 * @returns Markdown with known inline references rendered as HTML chips.
 *
 * @private utility of `renderMarkdown`
 */
function applyMarkdownInlineReferences(markdown: string_markdown, options?: RenderMarkdownOptions): string_markdown {
    const references = options?.inlineReferences;
    const className = options?.inlineReferenceClassName || DEFAULT_INLINE_REFERENCE_CLASS_NAME;

    if (!references || references.length === 0) {
        return markdown;
    }

    const renderedChips: Array<string> = [];
    const createPlaceholder: CreateMarkdownInlineReferencePlaceholder = (reference) => {
        const placeholder = `${INLINE_REFERENCE_PLACEHOLDER_PREFIX}${renderedChips.length}__`;
        renderedChips.push(renderMarkdownInlineReferenceHtml(reference, className));

        return placeholder;
    };

    const hrefMatchers = createMarkdownInlineReferenceHrefMatchers(references);
    let referencedMarkdown = replaceMarkdownInlineReferenceTokens(markdown, references, createPlaceholder);

    if (hrefMatchers.length !== 0) {
        referencedMarkdown = replaceMarkdownInlineReferenceLinks(referencedMarkdown, hrefMatchers, createPlaceholder);
        referencedMarkdown = replaceMarkdownInlineReferenceBareUrls(
            referencedMarkdown,
            hrefMatchers,
            createPlaceholder,
        );
    }

    const textMatchers = createMarkdownInlineReferenceTextMatchers(references);
    if (textMatchers.length !== 0) {
        const { masked: markdownWithMaskedLinksAndUrls, restore: restoreLinksAndUrls } =
            maskMarkdownLinksAndBareUrls(referencedMarkdown);
        referencedMarkdown = restoreLinksAndUrls(
            replaceMarkdownInlineReferenceTextAliases(
                markdownWithMaskedLinksAndUrls,
                textMatchers,
                createPlaceholder,
            ),
        );
    }

    return restoreMarkdownInlineReferenceChips(referencedMarkdown, renderedChips);
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
