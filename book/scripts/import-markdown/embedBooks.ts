import { spaceTrim } from 'spacetrim';
import { FormattedBookInMarkdownTranspiler } from '../../../src/transpilers/formatted-book-in-markdown/FormattedBookInMarkdownTranspiler';

/**
 * Embeds book content as HTML img tags with preview URLs
 *
 * Transforms book blocks from:
 * ```book
 * Title
 *
 * Content here
 * ```
 *
 * To:
 * <img alt="Title Book" src="https://promptbook.studio/embed/book-preview.png?book=...&width=800&height=450&nonce=X" />
 *
 * @param content The markdown content that may contain book blocks
 * @returns The content with book blocks replaced by img tags
 */
export function embedBooks(content: string): string {
    // Regular expression to match ```book blocks
    const bookRegex = /```book\s*\n([\s\S]*?)\n```/g;

    return content.replace(bookRegex, (match, bookContent) => {
        const markdown = FormattedBookInMarkdownTranspiler.transpileBook(bookContent, {}, {});
        return spaceTrim(
            (block) => `

                <table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

                ${block(markdown)}

                </td></tr></table>
            `,
        );
    });
}
