import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import {
    findUserPagePreviewBrowserSession,
    normalizePagePreviewBrowserSessionId,
} from '../../../../utils/pagePreviewBrowserSessions';

/**
 * Maximum absolute wheel delta accepted from one preview input event.
 *
 * @private route constant of `/api/page-preview/input`
 */
const MAX_WHEEL_DELTA = 1600;

/**
 * Payload accepted by the live page-preview input route.
 *
 * @private route type of `/api/page-preview/input`
 */
type PagePreviewInputPayload = {
    readonly sessionId?: unknown;
    readonly type?: unknown;
    readonly xRatio?: unknown;
    readonly yRatio?: unknown;
    readonly deltaX?: unknown;
    readonly deltaY?: unknown;
};

/**
 * Normalized browser input event.
 *
 * @private route type of `/api/page-preview/input`
 */
type PagePreviewInputEvent =
    | {
          readonly sessionId: string;
          readonly type: 'click';
          readonly xRatio: number;
          readonly yRatio: number;
      }
    | {
          readonly sessionId: string;
          readonly type: 'wheel';
          readonly xRatio: number;
          readonly yRatio: number;
          readonly deltaX: number;
          readonly deltaY: number;
      };

/**
 * Applies one pointer or wheel event to an active live browser preview session.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as PagePreviewInputPayload | null;
    const inputEvent = normalizePagePreviewInputEvent(payload);
    if (!inputEvent) {
        return NextResponse.json({ error: 'Invalid browser preview input.' }, { status: 400 });
    }

    const session = findUserPagePreviewBrowserSession(inputEvent.sessionId, currentUser);
    if (!session?.page || !session.viewport) {
        return NextResponse.json({ error: 'Browser preview session is not active.' }, { status: 404 });
    }

    const x = inputEvent.xRatio * session.viewport.width;
    const y = inputEvent.yRatio * session.viewport.height;

    if (inputEvent.type === 'click') {
        await session.page.mouse.click(x, y);
    } else {
        await session.page.mouse.move(x, y);
        await session.page.mouse.wheel(inputEvent.deltaX, inputEvent.deltaY);
    }

    return NextResponse.json({ ok: true });
}

/**
 * Normalizes and validates one browser-preview input payload.
 *
 * @param payload - Unknown JSON payload.
 * @returns Normalized input event or `null` when invalid.
 */
function normalizePagePreviewInputEvent(payload: PagePreviewInputPayload | null): PagePreviewInputEvent | null {
    if (!payload) {
        return null;
    }

    const sessionId = normalizePagePreviewBrowserSessionId(
        typeof payload.sessionId === 'string' ? payload.sessionId : null,
    );
    const xRatio = normalizeRatio(payload.xRatio);
    const yRatio = normalizeRatio(payload.yRatio);

    if (!sessionId || xRatio === null || yRatio === null) {
        return null;
    }

    if (payload.type === 'click') {
        return {
            sessionId,
            type: 'click',
            xRatio,
            yRatio,
        };
    }

    if (payload.type !== 'wheel') {
        return null;
    }

    const deltaX = normalizeWheelDelta(payload.deltaX);
    const deltaY = normalizeWheelDelta(payload.deltaY);
    if (deltaX === null || deltaY === null) {
        return null;
    }

    return {
        sessionId,
        type: 'wheel',
        xRatio,
        yRatio,
        deltaX,
        deltaY,
    };
}

/**
 * Normalizes a pointer coordinate ratio.
 *
 * @param value - Unknown payload value.
 * @returns Ratio clamped to the viewport bounds, or `null` when invalid.
 */
function normalizeRatio(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(0, Math.min(1, value));
}

/**
 * Normalizes one mouse-wheel delta.
 *
 * @param value - Unknown payload value.
 * @returns Clamped wheel delta, or `null` when invalid.
 */
function normalizeWheelDelta(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, value));
}

