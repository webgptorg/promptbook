import { NextRequest } from 'next/server';
import {
    createBookLanguageDocumentationMarkdownResponse,
    parseBookLanguageDocumentationExportOptions,
} from '../../../../utils/bookLanguageDocumentation/createBookLanguageDocumentationMarkdownResponse';
import { getRequestServerLanguage } from '../../../../utils/localization/getRequestServerLanguage';

/**
 * Forces dynamic evaluation so markdown is generated from freshest source blocks.
 */
export const dynamic = 'force-dynamic';

/**
 * Disables incremental revalidation for this route.
 */
export const revalidate = 0;

/**
 * Backward-compatible route for historical `/api/docs/book.md` links.
 *
 * The output is shared with the canonical `/api/docs/book-language.md` route.
 */
export async function GET(request: NextRequest) {
    const language = await getRequestServerLanguage();
    const options = parseBookLanguageDocumentationExportOptions(request.nextUrl.searchParams, language);

    return createBookLanguageDocumentationMarkdownResponse(options);
}
