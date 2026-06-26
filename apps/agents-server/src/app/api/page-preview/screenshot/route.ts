import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { assertSafeUrl } from '../../../../utils/assertSafeUrl';
import { getCurrentUser } from '../../../../utils/getCurrentUser';

/**
 * Takes a screenshot of the given URL using a headless browser.
 *
 * Query parameters:
 * - `url` — the fully-qualified HTTP(S) URL to screenshot
 *
 * Returns a PNG image.
 *
 * Requires authentication to prevent unauthenticated SSRF abuse.
 * The destination URL is validated against private/internal IP ranges before fetching.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing required query parameter: url' }, { status: 400 });
    }

    // Guard against SSRF: reject private/internal IPs and non-HTTP(S) schemes
    try {
        assertSafeUrl(url);
    } catch (error) {
        assertsError(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
        const browserContext = await $provideBrowserForServer();
        const page = await browserContext.newPage();

        try {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
            const screenshotBuffer = await page.screenshot({ type: 'png' });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new NextResponse(new Blob([screenshotBuffer as any]), {
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=300',
                },
            });
        } finally {
            await page.close().catch(() => {});
        }
    } catch (error) {
        assertsError(error);
        console.error('Error taking page screenshot:', error);
        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}
