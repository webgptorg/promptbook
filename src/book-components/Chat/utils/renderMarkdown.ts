import hljs from 'highlight.js';
import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/typeAliases';
// import 'highlight.js/styles/github-dark.css';
// <- TODO: !!!! Make this work

/**
 * Create a showdown converter instance optimized for chat messages
 *
 * @private utility of Chat components
 */
function createChatMarkdownConverter(): ShowdownConverter {
    return new ShowdownConverter({
        flavor: 'github',
        // Enable common markdown features for chat
        tables: true,
        strikethrough: true,
        tasklists: true,
        ghCodeBlocks: true,
        ghMentions: false, // Disable mentions to avoid unwanted @ processing
        ghMentionsLink: '',
        openLinksInNewWindow: true,
        backslashEscapesHTMLTags: true,
        emoji: true,
        underline: true,
        completeHTMLDocument: false,
        metadata: false,
        splitAdjacentBlockquotes: true,
        // Security settings
        noHeaderId: true, // Prevent header IDs that could cause conflicts
        headerLevelStart: 1,
        parseImgDimensions: true,
        simplifiedAutoLink: true,
        literalMidWordUnderscores: true,
        literalMidWordAsterisks: false,
        simpleLineBreaks: true, // Convert single line breaks to <br>
        requireSpaceBeforeHeadingText: true,
        ghCompatibleHeaderId: true,
        prefixHeaderId: 'chat-header-',
        rawPrefixHeaderId: false,
        rawHeaderId: false,
        smoothLivePreview: true,
        smartIndentationFix: true,
        disableForced4SpacesIndentedSublists: false,
        encodeEmails: true,
    });
}

// Create a singleton instance for performance
const chatMarkdownConverter = createChatMarkdownConverter();

/**
 * Convert markdown content to HTML for display in chat messages
 *
 * @param markdown - The markdown content to convert
 * @returns HTML string ready for rendering
 *
 * @public exported from `@promptbook/components`
 *         <- TODO: [🧠] Maybe export from `@promptbook/markdown-utils`
 */
export function renderMarkdown(markdown: string_markdown): string_html {
    if (!markdown || typeof markdown !== 'string') {
        return '' as string_html;
    }

    try {
        // Convert markdown to HTML
        let html = chatMarkdownConverter.makeHtml(markdown);

        if (typeof window === 'undefined') {
            // SSR: fallback to regex (less safe, but works for static export)
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
            // Browser: use DOMParser for robust manipulation
            // Inject highlight.js GitHub Dark CSS if not already present and code block exists
            if (html.match(/<pre><code/)) {
                const cssId = 'hljs-github-dark-css';
                if (!window.document.getElementById(cssId)) {
                    const link = window.document.createElement('link');
                    link.id = cssId;
                    link.rel = 'stylesheet';
                    link.href =
                        'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css';
                        // <- !!! Use Our CDN, Is it working?
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

        // Basic sanitization - remove potentially dangerous attributes
        // Note: For production use, consider using a proper HTML sanitizer like DOMPurify
        // Allow safe HTML tables (<table>, <tr>, <td>, <th>, <thead>, <tbody>, <tfoot>)
        // Remove script/style/iframe/object/embed tags and event handlers
        const sanitizedHtml = html
            .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '') // Remove dangerous tags
            .replace(/\s+on\w+="[^"]*"/gi, '') // Remove event handlers
            .replace(/\s+javascript:/gi, '') // Remove javascript: URLs
            .replace(/\s+data:/gi, '') // Remove data: URLs for security
            .replace(/\s+vbscript:/gi, ''); // Remove vbscript: URLs

        // Optionally, allow only specific tags (table-related and common markdown tags)
        // For now, we rely on Showdown + above regex for safety

        return sanitizedHtml as string_html;
    } catch (error) {
        console.error('Error rendering markdown:', error);
        // Fallback to plain text if markdown parsing fails
        return markdown.replace(/[<>&"']/g, (char) => {
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
}

/**
 * Check if content appears to be markdown (contains markdown syntax)
 *
 * @param content - Content to check
 * @returns true if content appears to contain markdown syntax
 *
 * @public exported from `@promptbook/components`
 *         <- TODO: [🧠] Maybe export from `@promptbook/markdown-utils`
 */
export function isMarkdownContent(content: string): boolean {
    if (!content || typeof content !== 'string') {
        return false;
    }

    // Check for common markdown patterns
    const markdownPatterns = [
        /^#{1,6}\s+/m, // Headers
        /\*\*.*?\*\*/, // Bold
        /\*.*?\*/, // Italic
        /`.*?`/, // Inline code
        /```[\s\S]*?```/, // Code blocks
        /^\s*[-*+]\s+/m, // Unordered lists
        /^\s*\d+\.\s+/m, // Ordered lists
        /^\s*>\s+/m, // Blockquotes
        /\[.*?\]\(.*?\)/, // Links
        /!\[.*?\]\(.*?\)/, // Images
        /^\s*\|.*\|/m, // Tables
        /~~.*?~~/, // Strikethrough
        /^\s*---+\s*$/m, // Horizontal rules
    ];

    return markdownPatterns.some((pattern) => pattern.test(content));
}
