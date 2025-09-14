import { Converter as ShowdownConverter } from 'showdown';
import type { string_html, string_markdown } from '../../../types/typeAliases';

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
        encodeEmails: true
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
 * @public exported from Chat utils
 */
export function renderMarkdown(markdown: string_markdown): string_html {
    if (!markdown || typeof markdown !== 'string') {
        return '' as string_html;
    }

    try {
        // Convert markdown to HTML
        const html = chatMarkdownConverter.makeHtml(markdown);

        // Basic sanitization - remove potentially dangerous attributes
        // Note: For production use, consider using a proper HTML sanitizer like DOMPurify
        const sanitizedHtml = html
            .replace(/\s+on\w+="[^"]*"/gi, '') // Remove event handlers
            .replace(/\s+javascript:/gi, '') // Remove javascript: URLs
            .replace(/\s+data:/gi, '') // Remove data: URLs for security
            .replace(/\s+vbscript:/gi, ''); // Remove vbscript: URLs

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
                "'": '&#39;'
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
 * @public exported from Chat utils
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

    return markdownPatterns.some(pattern => pattern.test(content));
}
