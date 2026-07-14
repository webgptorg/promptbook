import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
    clampPagePreviewViewport,
    PAGE_PREVIEW_DEFAULT_VIEWPORT,
} from '../../../../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewViewport';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { assertSafeUrl } from '../../../../utils/assertSafeUrl';
import {
    createPagePreviewBrowserStream,
    PAGE_PREVIEW_STREAM_CONTENT_TYPE,
} from '../../../../utils/createPagePreviewBrowserStream';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import {
    normalizePagePreviewBrowserSessionId,
    registerPagePreviewBrowserSession,
} from '../../../../utils/pagePreviewBrowserSessions';

/**
 * Forces this route to stream a fresh live browser session for every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Streams a live browser preview of a public URL.
 *
 * Query parameters:
 * - `url` — fully-qualified public HTTP(S) URL to preview
 * - `sessionId` — client-created browser-preview session id used for interaction events
 * - `width` / `height` — optional initial viewport measured from the client preview area
 *
 * Requires authentication to prevent unauthenticated SSRF and browser-process abuse.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get('url');
    const sessionId = normalizePagePreviewBrowserSessionId(request.nextUrl.searchParams.get('sessionId'));
    const viewport =
        clampPagePreviewViewport(
            Number.parseFloat(request.nextUrl.searchParams.get('width') ?? ''),
            Number.parseFloat(request.nextUrl.searchParams.get('height') ?? ''),
        ) ?? PAGE_PREVIEW_DEFAULT_VIEWPORT;

    if (!url) {
        return NextResponse.json({ error: 'Missing required query parameter: url' }, { status: 400 });
    }

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing or invalid query parameter: sessionId' }, { status: 400 });
    }

    try {
        assertSafeUrl(url);
    } catch (error) {
        assertsError(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
        registerPagePreviewBrowserSession({
            sessionId,
            url,
            user: currentUser,
        });

        const stream = createPagePreviewBrowserStream({
            request,
            sessionId,
            url,
            viewport,
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': PAGE_PREVIEW_STREAM_CONTENT_TYPE,
                'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    } catch (error) {
        assertsError(error);
        console.error('[page-preview] failed to start live browser stream', error);
        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}

