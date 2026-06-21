import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { fetchUrlContent } from '../../../../../../src/commitments/USE_BROWSER/fetchUrlContent';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import { assertSafeUrl } from '../../../utils/assertSafeUrl';

/**
 * API endpoint for scraping URL content
 *
 * This endpoint proxies the server-side scraping functionality to be accessible from the browser.
 * It uses the fetchUrlContent utility to fetch and convert web content to markdown.
 *
 * Requires authentication to prevent unauthenticated SSRF abuse.
 * The destination URL is validated against private/internal IP ranges before fetching.
 *
 * @route GET /api/scrape?url=<url>
 */
export async function GET(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the URL parameter from the query string
        const searchParams = request.nextUrl.searchParams;
        const url = searchParams.get('url');

        // Validate URL parameter
        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }

        // Guard against SSRF: reject private/internal IPs and non-HTTP(S) schemes
        try {
            assertSafeUrl(url);
        } catch (error) {
            assertsError(error);
            return NextResponse.json({ error: error.message, success: false }, { status: 400 });
        }

        // Use the server-side fetchUrlContent utility
        const content = await fetchUrlContent(url);

        // Return the scraped content
        return NextResponse.json(
            {
                url,
                content,
                success: true,
            },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );
    } catch (error) {
        assertsError(error);
        console.error('Error scraping URL:', error);

        return NextResponse.json(
            {
                error: serializeError(error),
                success: false,
            },
            { status: 500 },
        );
    }
}

// Note: [🟢] Code for Agents Server scrape API route [scrape route](apps/agents-server/src/app/api/scrape/route.ts) should never be published into packages that could be imported into browser environment
// Note: It proxies server-side scraping functionality safely.
