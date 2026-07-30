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
 * Canonical standalone Book language documentation route.
 *
 * Returns a single generated markdown document suitable for copy-paste into
 * external tools or sharing with developers as a complete learning material.
 */
export async function GET(request: NextRequest) {
    const language = await getRequestServerLanguage();
    const options = parseBookLanguageDocumentationExportOptions(request.nextUrl.searchParams, language);

    return createBookLanguageDocumentationMarkdownResponse(options);
}
