import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
    LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT,
    LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH,
} from '../../../../../../../src/book-components/Chat/utils/livePagePreviewConstants';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { resolvePagePreviewRequestUrl } from '../../../../utils/pagePreview/resolvePagePreviewRequestUrl';

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
    const requestUrlResolution = await resolvePagePreviewRequestUrl(request);
    if (requestUrlResolution.errorResponse !== null) {
        return requestUrlResolution.errorResponse;
    }

    try {
        const browserContext = await $provideBrowserForServer();
        const page = await browserContext.newPage();

        try {
            await page.setViewportSize({
                width: LIVE_PAGE_PREVIEW_VIEWPORT_WIDTH,
                height: LIVE_PAGE_PREVIEW_VIEWPORT_HEIGHT,
            });
            await page.goto(requestUrlResolution.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
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
