import { highlightBookSourceToHtml } from '../../../../../src/book-components/BookEditor/highlightBookSourceToHtml';

/**
 * Matches one fenced code block rendered by the markdown renderer.
 *
 * @private internal constant of `highlightBookCodeBlocksInHtml`
 */
const RENDERED_CODE_BLOCK_REGEX = /<pre><code class="([^"]*)">([\s\S]*?)<\/code><\/pre>/g;

/**
 * Info-string language marking a Book source code block.
 *
 * @private internal constant of `highlightBookCodeBlocksInHtml`
 */
const BOOK_CODE_BLOCK_LANGUAGE_CLASS_NAME = 'language-book';

/**
 * Class name marking a `<pre>` that contains highlighted Book source.
 */
export const BOOK_SOURCE_PRE_CLASS_NAME = 'book-source';

/**
 * HTML entities produced while rendering markdown code blocks.
 *
 * @private internal constant of `highlightBookCodeBlocksInHtml`
 */
const RENDERED_HTML_ENTITIES: Readonly<Record<string, string>> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
};

/**
 * Replaces every rendered ```book code block with syntax-highlighted markup.
 *
 * The highlighting itself is done by `highlightBookSourceToHtml`, which shares
 * its tokens and colors with `<BookEditor/>`.
 *
 * @param html - HTML produced from the manual markdown.
 * @returns HTML where Book sources are syntax highlighted.
 */
export function highlightBookCodeBlocksInHtml(html: string): string {
    RENDERED_CODE_BLOCK_REGEX.lastIndex = 0;

    return html.replace(RENDERED_CODE_BLOCK_REGEX, (match, className: string, renderedSource: string) => {
        if (!className.split(/\s+/).includes(BOOK_CODE_BLOCK_LANGUAGE_CLASS_NAME)) {
            return match;
        }

        const bookSource = decodeRenderedHtmlEntities(renderedSource).replace(/\n$/, '');

        return `<pre class="${BOOK_SOURCE_PRE_CLASS_NAME}"><code>${highlightBookSourceToHtml(bookSource)}</code></pre>`;
    });
}

/**
 * Restores the raw Book source from a rendered markdown code block.
 *
 * @param renderedSource - HTML-escaped code block content.
 * @returns Original Book source text.
 *
 * @private internal utility of `highlightBookCodeBlocksInHtml`
 */
function decodeRenderedHtmlEntities(renderedSource: string): string {
    return renderedSource.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => RENDERED_HTML_ENTITIES[entity] || entity);
}
