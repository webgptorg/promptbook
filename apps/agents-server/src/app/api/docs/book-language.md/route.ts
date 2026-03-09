import { createBookLanguageDocumentationMarkdownResponse } from '../../../../utils/bookLanguageDocumentation/createBookLanguageDocumentationMarkdownResponse';

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
export async function GET() {
    return createBookLanguageDocumentationMarkdownResponse();
}
