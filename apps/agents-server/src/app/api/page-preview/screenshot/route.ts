import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';

/**
 * Takes a screenshot of the given URL using a headless browser.
 *
 * Query parameters:
 * - `url` — the fully-qualified HTTP(S) URL to screenshot
 *
 * Returns a PNG image.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing required query parameter: url' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Only http and https URLs are supported' }, { status: 400 });
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
