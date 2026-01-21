import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { fetchUrlContent } from '../../../../../../../src/commitments/USE_BROWSER/fetchUrlContent';
import { assertsError } from '../../../../../../../src/errors/assertsError';

/**
 * API endpoint for scraping URL content
 *
 * This endpoint proxies the server-side scraping functionality to be accessible from the browser.
 * It uses the fetchUrlContent utility to fetch and convert web content to markdown.
 *
 * @route GET /api/scrape?url=<url>
 */
export async function GET(request: NextRequest) {
    try {
        // Get the URL parameter from the query string
        const searchParams = request.nextUrl.searchParams;
        const url = searchParams.get('url');

        // Validate URL parameter
        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
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

/**
 * Note: [🟢] This API endpoint is designed to be used from the browser environment
 * It proxies server-side scraping functionality safely
 */
