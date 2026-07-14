import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { normalizePagePreviewInputEvent } from '../../../../../../../src/book-components/Chat/Chat/pagePreview/normalizePagePreviewInputEvent';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { applyPagePreviewBrowserInput } from '../../../../utils/applyPagePreviewBrowserInput';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import { getPagePreviewBrowserSessionState } from '../../../../utils/getPagePreviewBrowserSessionState';
import {
    findUserPagePreviewBrowserSession,
    normalizePagePreviewBrowserSessionId,
} from '../../../../utils/pagePreviewBrowserSessions';

/**
 * Applies one remote-control event to an active live browser preview session.
 *
 * Accepts the full page-preview input protocol — pointer moves (hover), presses and releases
 * (clicks, double-clicks, drags, text selection), wheel scrolling, keyboard typing, viewport
 * resizes, history navigation, and direct URL navigation. Responds with the fresh session
 * navigation state so the preview toolbar stays in sync.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
    const sessionId = normalizePagePreviewBrowserSessionId(
        typeof payload?.sessionId === 'string' ? payload.sessionId : null,
    );
    const inputEvent = normalizePagePreviewInputEvent(payload);
    if (!sessionId || !inputEvent) {
        return NextResponse.json({ error: 'Invalid browser preview input.' }, { status: 400 });
    }

    const session = findUserPagePreviewBrowserSession(sessionId, currentUser);
    if (!session?.page || !session.viewport) {
        return NextResponse.json({ error: 'Browser preview session is not active.' }, { status: 404 });
    }

    try {
        await applyPagePreviewBrowserInput(session, inputEvent);
    } catch (error) {
        assertsError(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const state = await getPagePreviewBrowserSessionState(session);
    return NextResponse.json({ ok: true, state });
}
