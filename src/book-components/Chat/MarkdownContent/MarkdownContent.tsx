'use client';

import katex from 'katex';
import { useEffect, useMemo, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { classNames } from '../../_common/react-utils/classNames';
import { CodeBlock } from '../CodeBlock/CodeBlock';
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
                regex: /【(.*?)†(.*?)】/g,
                replace: (match: string, id: string, source: string) => {
                    TODO_USE(source);

                    // Note: Citations are now rendered as chips in ChatMessageItem
                    // We replace them with numbered superscript references
                    return `<sup class="${styles.citationRef}">[${id}]</sup>`;
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

/**
 * Renders math expressions in markdown using KaTeX
 *
 * @private utility of `MarkdownContent` component
 */
function renderMathInMarkdown(md: string): string {
    md = md.replace(/(^|[^\\])\$\$([\s\S]+?)\$\$/g, (match, prefix, math) => {
        try {
            const rendered = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return prefix + rendered;
        } catch {
            return match;
        }
    });
    md = md.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (match, prefix, math) => {
        if (/^\s*$/.test(math)) return match;
        try {
            const rendered = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return prefix + rendered;
        } catch {
            return match;
        }
    });
    md = md.replace(/\\$/g, '$');
    return md;
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
        const processedMarkdown = renderMathInMarkdown(normalizedMarkdown);
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

        const sanitizedHtml = html
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
 * Renders markdown content with support for code highlighting, math, and tables.
 *
 * @public exported from `@promptbook/components`
 */
export function MarkdownContent(props: MarkdownContentProps) {
    const { content, className, onCreateAgent } = props;
    const htmlContent = useMemo(() => renderMarkdown(content), [content]);
    const containerRef = useRef<HTMLDivElement>(null);
    const rootsRef = useRef<Root[]>([]);

    useEffect(() => {
        // Cleanup previous roots
        rootsRef.current.forEach((root) => root.unmount());
        rootsRef.current = [];

        if (!containerRef.current) {
            return;
        }

        const preElements = containerRef.current.querySelectorAll('pre');

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
            root.render(<CodeBlock code={code} language={language} onCreateAgent={onCreateAgent} />);
            rootsRef.current.push(root);
        });

        return () => {
            rootsRef.current.forEach((root) => root.unmount());
            rootsRef.current = [];
        };
    }, [htmlContent, onCreateAgent]);

    return (
        <div
            ref={containerRef}
            className={classNames(styles.MarkdownContent, className)}
            dangerouslySetInnerHTML={{
                __html: htmlContent,
            }}
        />
    );
}

/**
 * TODO: !!! Split into multiple files
 */
