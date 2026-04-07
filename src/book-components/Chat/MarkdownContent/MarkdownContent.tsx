'use client';

import katex from 'katex';
import { memo, useEffect, useMemo, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { classNames } from '../../_common/react-utils/classNames';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import { createCitationMarkerRegex, parseCitationMarker } from '../utils/parseCitationMarker';
import styles from './MarkdownContent.module.css';

/**
 * Normalizes markdown sublists so they render correctly under ordered list items.
 *
 * @param markdown - Markdown content to normalize.
 * @returns Markdown with normalized sublist indentation.
 *
 * @private utility of `MarkdownContent` component
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
 * Creates a showdown converter configured for chat markdown rendering
 *
 * @private utility of `MarkdownContent` component
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

                    // Note: Citations are now rendered as chips in ChatMessageItem
                    // We replace them with numbered superscript references
                    return `<sup class="${styles.citationRef}">[${citationMarker.id}]</sup>`;
                },
            }),
        ],
    });
}

/**
 * Pre-configured showdown converter for chat markdown
 *
 * @private utility of `MarkdownContent` component
 */
const chatMarkdownConverter = createChatMarkdownConverter();

type MathDelimiterDefinition = {
    regex: RegExp;
    displayMode: boolean;
};

const mathDelimiterDefinitions: ReadonlyArray<MathDelimiterDefinition> = [
    { regex: /(^|[^\\])\$\$([\s\S]+?)\$\$/g, displayMode: true },
    { regex: /(^|[^\\])\\\[([\s\S]+?)\\\]/g, displayMode: true },
    { regex: /(^|[^\\])\\\(([\s\S]+?)\\\)/g, displayMode: false },
    { regex: /(^|[^\\])\$([^$\n]+?)\$/g, displayMode: false },
];

const CODE_FENCE_REGEX = /(`{3,}|~{3,})(?:[^\n\r]*)\r?\n[\s\S]*?\r?\n\1[^\n\r]*/g;
const INLINE_CODE_REGEX = /(`+)([\s\S]*?)(\1)/g;
const CODE_PLACEHOLDER_PREFIX = '@@PROMPTBOOK_CODE_PLACEHOLDER__';
const CODE_PLACEHOLDER_REGEX = new RegExp(`${CODE_PLACEHOLDER_PREFIX}(\\d+)__`, 'g');

const DETAILS_BLOCK_REGEX = /<details[\s\S]*?<\/details\s*>/gi;
const DETAILS_PLACEHOLDER_PREFIX = '@@PROMPTBOOK_DETAILS_PLACEHOLDER__';
const DETAILS_PLACEHOLDER_REGEX = new RegExp(`${DETAILS_PLACEHOLDER_PREFIX}(\\d+)__`, 'g');
/** Matches a Showdown-wrapped placeholder such as `<p>@@PROMPTBOOK_DETAILS_PLACEHOLDER__0__</p>` */
const DETAILS_PLACEHOLDER_WRAPPED_REGEX = new RegExp(`<p>\\s*(${DETAILS_PLACEHOLDER_PREFIX}\\d+__)\\s*<\\/p>`, 'g');

/**
 * Selector used by the delegated summary click handler.
 *
 * @private utility of `MarkdownContent` component
 */
const DETAILS_SUMMARY_SELECTOR = 'summary';

type MaskedCodeSegmentsResult = {
    masked: string_markdown;
    restore: (value: string_markdown) => string_markdown;
};

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
 * @private utility of `MarkdownContent` component
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
 * @private utility of `MarkdownContent` component
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
 * The original blocks are replaced with placeholders before Showdown runs, then restored
 * afterwards with their non-summary body converted through the normal markdown pipeline.
 * Any surrounding `<p>` wrapper that Showdown may have injected around a placeholder is
 * stripped so the `<details>` element remains a proper block-level element.
 *
 * @param markdown - Markdown text that may contain raw HTML `<details>` blocks.
 * @returns Masked markdown and a restore helper that returns `string_html`.
 *
 * @private utility of `MarkdownContent` component
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

function replaceMathDelimiter(md: string, delimiter: MathDelimiterDefinition): string {
    return md.replace(delimiter.regex, (...args) => {
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
 * @private utility of `MarkdownContent` component
 */
function renderMathInMarkdown(md: string): string {
    const { masked, restore } = maskMarkdownCodeSegments(md);
    let processed = masked;

    for (const delimiter of mathDelimiterDefinitions) {
        processed = replaceMathDelimiter(processed, delimiter);
    }
    processed = processed.replace(/\\$/g, '$');
    return restore(processed);
}

/**
 * Convert markdown content to HTML
 *
 * @param markdown - The markdown content to convert
 * @returns HTML string ready for rendering
 *
 * @public exported from `@promptbook/components`
 *         <- TODO: [🧠] Maybe export from `@promptbook/markdown-utils`
 */
function renderMarkdown(markdown: string_markdown): string_html {
    if (!markdown || typeof markdown !== 'string') {
        return '' as string_html;
    }

    try {
        const normalizedMarkdown = normalizeMarkdownSublists(markdown);
        const { masked: maskedMarkdown, restore: restoreDetails } = maskDetailsBlocks(normalizedMarkdown);
        const processedMarkdown = renderMathInMarkdown(maskedMarkdown);
        const html = chatMarkdownConverter.makeHtml(processedMarkdown);

        if (typeof window !== 'undefined') {
            if (html.match(/class="katex/)) {
                const katexCssId = 'katex-css';
                if (!window.document.getElementById(katexCssId)) {
                    const link = window.document.createElement('link');
                    link.id = katexCssId;
                    link.rel = 'stylesheet';
                    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                    window.document.head.appendChild(link);
                }
            }
        }

        const restoredHtml = restoreDetails(html as string_html);
        const sanitizedHtml = restoredHtml
            .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
            .replace(/\s+on\w+="[^"]*"/gi, '')
            .replace(/\s+javascript:/gi, '')
            .replace(/\s+data:/gi, '')
            .replace(/\s+vbscript:/gi, '');

        return sanitizedHtml as string_html;
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return markdown.replace(/[<>&"']/g, (char) => {
            const entities: Record<string, string> = {
                '<': '<',
                '>': '>',
                '&': '&',
                '"': '"',
                "'": '&#39;',
            };
            return entities[char] || char;
        }) as string_html;
    }
}

type MarkdownContentProps = {
    content: string_markdown;

    className?: string;
    onCreateAgent?: (bookContent: string) => void;
};

/**
 * Returns a stable key for a `<details>` element based on its `<summary>` text.
 * Used to identify and restore open state across re-renders.
 *
 * @private utility of `MarkdownContent` component
 */
function getDetailsKey(details: HTMLDetailsElement): string {
    const summary = details.querySelector('summary');
    return summary?.textContent?.trim() ?? '';
}

/**
 * Synchronizes the stored open-state registry with the current state of one `<details>` element.
 *
 * @param details - The `<details>` element whose open state should be tracked.
 * @param openDetailsKeys - Mutable registry of currently open details keys.
 * @private utility of `MarkdownContent` component
 */
function syncTrackedDetailsOpenState(details: HTMLDetailsElement, openDetailsKeys: Set<string>): void {
    const key = getDetailsKey(details);

    if (details.open) {
        openDetailsKeys.add(key);
    } else {
        openDetailsKeys.delete(key);
    }
}

/**
 * Resolves the `<details>` element that owns the clicked `<summary>`, if any.
 *
 * @param target - Event target received from the delegated click listener.
 * @param container - Markdown container that owns the rendered HTML.
 * @returns Matching `<details>` element or `null` when the click happened elsewhere.
 * @private utility of `MarkdownContent` component
 */
function resolveClickedDetailsElement(target: EventTarget | null, container: HTMLElement): HTMLDetailsElement | null {
    const targetElement =
        target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

    if (!(targetElement instanceof Element)) {
        return null;
    }

    const summary = targetElement.closest(DETAILS_SUMMARY_SELECTOR);
    if (!(summary instanceof HTMLElement) || !container.contains(summary)) {
        return null;
    }

    const details = summary.closest('details');
    return details instanceof HTMLDetailsElement ? details : null;
}

/**
 * Renders markdown content with support for code highlighting, math, and tables.
 *
 * @public exported from `@promptbook/components`
 */
export const MarkdownContent = memo(function MarkdownContent(props: MarkdownContentProps) {
    const { content, className, onCreateAgent } = props;
    const htmlContent = useMemo(() => renderMarkdown(content), [content]);
    const containerRef = useRef<HTMLDivElement>(null);
    const rootsRef = useRef<Root[]>([]);
    /** Tracks which `<details>` elements (by summary key) are currently open */
    const openDetailsKeysRef = useRef<Set<string>>(new Set());
    const onCreateAgentRef = useRef(onCreateAgent);
    onCreateAgentRef.current = onCreateAgent;

    useEffect(() => {
        // Cleanup previous roots
        rootsRef.current.forEach((root) => root.unmount());
        rootsRef.current = [];

        const containerElement = containerRef.current;

        if (!containerElement) {
            return;
        }

        // Restore previously open <details> elements that may have been closed by a
        // streaming innerHTML update (dangerouslySetInnerHTML resets the DOM on every
        // content change, which collapses any open <details> back to closed).
        const detailsElements = containerElement.querySelectorAll<HTMLDetailsElement>('details');
        detailsElements.forEach((details) => {
            if (openDetailsKeysRef.current.has(getDetailsKey(details))) {
                details.open = true;
            }
        });

        // Keep openDetailsKeysRef in sync when the user toggles a <details> element.
        const handleToggle = (event: Event) => {
            const details = event.target;
            if (!(details instanceof HTMLDetailsElement) || !containerElement.contains(details)) {
                return;
            }

            syncTrackedDetailsOpenState(details, openDetailsKeysRef.current);
        };

        const pendingToggleFallbackTimeoutIds = new Set<number>();

        // Let the browser perform the native `<details>` toggle, but stop the click from bubbling
        // into surrounding chat-level handlers. When the environment does not implement native
        // `<summary>` toggling (for example JSDOM tests), a short fallback keeps behavior covered.
        const handleSummaryClick = (event: MouseEvent) => {
            const details = resolveClickedDetailsElement(event.target, containerElement);
            if (!details) {
                return;
            }

            event.stopPropagation();

            const previousOpenState = details.open;
            const fallbackTimeoutId = window.setTimeout(() => {
                pendingToggleFallbackTimeoutIds.delete(fallbackTimeoutId);

                if (!details.isConnected || details.open !== previousOpenState) {
                    return;
                }

                details.open = !previousOpenState;
                syncTrackedDetailsOpenState(details, openDetailsKeysRef.current);
            }, 0);

            pendingToggleFallbackTimeoutIds.add(fallbackTimeoutId);
        };

        containerElement.addEventListener('toggle', handleToggle, true);
        containerElement.addEventListener('click', handleSummaryClick);

        const preElements = containerElement.querySelectorAll('pre');

        preElements.forEach((pre) => {
            // Check if it is a code block (has code element)
            const codeElement = pre.querySelector('code');
            if (!codeElement) {
                return;
            }

            // Get language and code
            const className = codeElement.className; // e.g. language-python
            const match = className.match(/language-([^\s]+)/);
            const language = match ? match[1] : undefined;
            const code = codeElement.textContent || '';

            // Clear the pre element content
            pre.innerHTML = '';
            pre.className = ''; // remove existing classes if any
            pre.style.background = 'none'; // reset styles
            pre.style.padding = '0';
            pre.style.margin = '0';
            pre.style.overflow = 'visible';

            // Create a container for the CodeBlock
            const mountPoint = document.createElement('div');
            pre.appendChild(mountPoint);

            // Render CodeBlock
            const root = createRoot(mountPoint);
            root.render(<CodeBlock code={code} language={language} onCreateAgent={onCreateAgentRef.current} />);
            rootsRef.current.push(root);
        });

        return () => {
            containerElement.removeEventListener('toggle', handleToggle, true);
            containerElement.removeEventListener('click', handleSummaryClick);
            pendingToggleFallbackTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
            pendingToggleFallbackTimeoutIds.clear();
            rootsRef.current.forEach((root) => root.unmount());
            rootsRef.current = [];
        };
    }, [htmlContent]);

    return (
        <div
            ref={containerRef}
            className={classNames(styles.MarkdownContent, className)}
            dangerouslySetInnerHTML={{
                __html: htmlContent,
            }}
        />
    );
});

/**
 * TODO: !!! Split into multiple files
 */
