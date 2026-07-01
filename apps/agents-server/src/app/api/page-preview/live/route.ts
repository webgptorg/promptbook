import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import {
    createLivePagePreviewStream,
    getOrCreateLivePagePreviewSession,
    isLivePagePreviewSessionId,
    LIVE_PAGE_PREVIEW_STREAM_CONTENT_TYPE,
} from '../../../../utils/pagePreview/livePagePreviewSessions';
import { resolvePagePreviewRequestUrl } from '../../../../utils/pagePreview/resolvePagePreviewRequestUrl';

/**
 * Query parameter containing the browser-side live preview session id.
 */
const LIVE_PAGE_PREVIEW_SESSION_ID_QUERY_PARAMETER = 'sessionId';

/**
 * Constant for dynamic route rendering.
 */
export const dynamic = 'force-dynamic';

/**
 * Streams a live browser preview for a knowledge source URL.
 *
 * Query parameters:
 * - `url` — fully-qualified HTTP(S) URL to preview
 * - `sessionId` — client-generated id used for forwarding interactions
 *
 * Requires authentication to prevent unauthenticated SSRF abuse.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestUrlResolution = await resolvePagePreviewRequestUrl(request);
    if (requestUrlResolution.errorResponse !== null) {
        return requestUrlResolution.errorResponse;
    }

    const sessionId = request.nextUrl.searchParams.get(LIVE_PAGE_PREVIEW_SESSION_ID_QUERY_PARAMETER);
    if (!sessionId || !isLivePagePreviewSessionId(sessionId)) {
        return NextResponse.json({ error: 'Missing or invalid live preview session id.' }, { status: 400 });
    }

    try {
        const page = await getOrCreateLivePagePreviewSession({
            sessionId,
            url: requestUrlResolution.url,
            signal: request.signal,
        });
        const stream = createLivePagePreviewStream({
            sessionId,
            page,
            signal: request.signal,
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': LIVE_PAGE_PREVIEW_STREAM_CONTENT_TYPE,
                'Cache-Control': 'no-cache, no-store, max-age=0',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        assertsError(error);
        console.error('Error streaming live page preview:', error);
        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}
