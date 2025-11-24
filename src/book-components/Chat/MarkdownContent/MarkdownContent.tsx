'use client';

import hljs from 'highlight.js';
import katex from 'katex';
import { useMemo } from 'react';
import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/typeAliases';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './MarkdownContent.module.css';

/**
 * @@@
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
                regex: /【(.*?)†source】/g,
                replace: (match: string, content: string) => {
                    return `<span class="${styles.citation}">${content}</span>`;
                },
            }),
        ],
    });
}

/**
 * @@@
 *
 * @private utility of `MarkdownContent` component
 */
const chatMarkdownConverter = createChatMarkdownConverter();

/**
 * @@@
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
        const processedMarkdown = renderMathInMarkdown(markdown);
        let html = chatMarkdownConverter.makeHtml(processedMarkdown);

        if (typeof window === 'undefined') {
            html = html.replace(
                /<pre><code( class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
                (match, _langClass, lang, code) => {
                    const decoded = code
                        .replace(/&/g, '&')
                        .replace(/</g, '<')
                        .replace(/>/g, '>')
                        .replace(/"/g, '"')
                        .replace(/&#39;/g, "'");
                    const highlighted = lang
                        ? hljs.highlight(decoded, { language: lang }).value
                        : hljs.highlightAuto(decoded).value;
                    return `<pre class="chat-code-block"><code class="hljs${
                        lang ? ' language-' + lang : ''
                    }">${highlighted}</code></pre>`;
                },
            );
        } else {
            if (html.match(/<pre><code/)) {
                const cssId = 'hljs-github-dark-css';
                if (!window.document.getElementById(cssId)) {
                    const link = window.document.createElement('link');
                    link.id = cssId;
                    link.rel = 'stylesheet';
                    link.href = 'https://book-components.ptbk.io/cdn/highlightjs/github-dark.css';
                    window.document.head.appendChild(link);
                }
            }
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
            const parser = new window.DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            doc.querySelectorAll('pre > code').forEach((codeEl) => {
                const preEl = codeEl.parentElement;
                if (!preEl) return;
                const lang = Array.from(codeEl.classList)
                    .find((cls) => cls.startsWith('language-'))
                    ?.replace('language-', '');
                const code = codeEl.innerHTML;
                let highlighted = '';
                try {
                    const decoded = code
                        .replace(/&/g, '&')
                        .replace(/</g, '<')
                        .replace(/>/g, '>')
                        .replace(/"/g, '"')
                        .replace(/&#39;/g, "'");
                    highlighted = lang
                        ? hljs.highlight(decoded, { language: lang }).value
                        : hljs.highlightAuto(decoded).value;
                } catch {
                    highlighted = code;
                }
                codeEl.innerHTML = highlighted;
                codeEl.classList.add('hljs');
                if (lang) codeEl.classList.add(`language-${lang}`);
                preEl.classList.add('chat-code-block');
            });
            html = doc.body.innerHTML;
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
};

/**
 * Renders markdown content with support for code highlighting, math, and tables.
 *
 * @public exported from `@promptbook/components`
 */
export function MarkdownContent(props: MarkdownContentProps) {
    const { content, className } = props;
    const htmlContent = useMemo(() => renderMarkdown(content), [content]);

    return (
        <div
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
