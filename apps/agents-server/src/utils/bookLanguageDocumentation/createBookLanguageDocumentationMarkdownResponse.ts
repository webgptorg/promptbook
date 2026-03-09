import { NextResponse } from 'next/server';
import { createStandaloneBookLanguageMarkdown } from './createStandaloneBookLanguageMarkdown';

/**
 * Response headers for standalone Book language markdown docs.
 *
 * `no-store` is intentional so the route always serves the freshest generated
 * output from current source-of-truth definitions.
 */
export const BOOK_LANGUAGE_DOCUMENTATION_MARKDOWN_HEADERS = Object.freeze({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
});

/**
 * Creates markdown response for standalone Book language documentation.
 *
 * @returns HTTP response with generated markdown and canonical headers.
 */
export function createBookLanguageDocumentationMarkdownResponse(): NextResponse<string> {
    const markdown = createStandaloneBookLanguageMarkdown();

    return new NextResponse(markdown, {
        headers: BOOK_LANGUAGE_DOCUMENTATION_MARKDOWN_HEADERS,
    });
}
