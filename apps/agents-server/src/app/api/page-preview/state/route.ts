import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import { getPagePreviewBrowserSessionState } from '../../../../utils/getPagePreviewBrowserSessionState';
import {
    findUserPagePreviewBrowserSession,
    normalizePagePreviewBrowserSessionId,
} from '../../../../utils/pagePreviewBrowserSessions';

/**
 * Forces this route to read fresh session state on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Returns the navigation state of one active live browser preview session.
 *
 * Query parameters:
 * - `sessionId` — page-preview browser session id owned by the current user
 *
 * The preview toolbar polls this route to keep its URL bar and history buttons in sync with
 * navigations that happen inside the remote page itself (for example clicked links).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = normalizePagePreviewBrowserSessionId(request.nextUrl.searchParams.get('sessionId'));
    if (!sessionId) {
        return NextResponse.json({ error: 'Missing or invalid query parameter: sessionId' }, { status: 400 });
    }

    const session = findUserPagePreviewBrowserSession(sessionId, currentUser);
    if (!session) {
        return NextResponse.json({ error: 'Browser preview session is not active.' }, { status: 404 });
    }

    const state = await getPagePreviewBrowserSessionState(session);
    if (!state) {
        return NextResponse.json({ error: 'Browser preview session has no active page.' }, { status: 404 });
    }

    return NextResponse.json({ state });
}
