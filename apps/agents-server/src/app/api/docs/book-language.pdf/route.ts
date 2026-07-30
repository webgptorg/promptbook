import { NextRequest } from 'next/server';
import { parseBookLanguageDocumentationExportOptions } from '../../../../utils/bookLanguageDocumentation/createBookLanguageDocumentationMarkdownResponse';
import { createBookLanguageDocumentationPdfResponse } from '../../../../utils/bookLanguageDocumentation/createBookLanguageDocumentationPdfResponse';
import { getRequestServerLanguage } from '../../../../utils/localization/getRequestServerLanguage';

/**
 * PDF rendering needs the Node.js runtime for Playwright.
 */
export const runtime = 'nodejs';

/**
 * Forces generation from the current server agents and commitment registry.
 */
export const dynamic = 'force-dynamic';

/**
 * Disables incremental revalidation for manually generated PDF exports.
 */
export const revalidate = 0;

/**
 * Generates a standalone Book language manual PDF without printing the app UI.
 */
export async function GET(request: NextRequest) {
    const language = await getRequestServerLanguage();
    const options = parseBookLanguageDocumentationExportOptions(request.nextUrl.searchParams, language);

    return createBookLanguageDocumentationPdfResponse(options);
}
