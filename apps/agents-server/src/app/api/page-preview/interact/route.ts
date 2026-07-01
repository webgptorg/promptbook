import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { getCurrentUser } from '../../../../utils/getCurrentUser';
import {
    applyLivePagePreviewInteraction,
    isLivePagePreviewSessionId,
    type LivePagePreviewInteraction,
} from '../../../../utils/pagePreview/livePagePreviewSessions';

/**
 * Maximum wheel delta accepted from one live-preview UI event.
 */
const MAX_LIVE_PAGE_PREVIEW_WHEEL_DELTA = 4_000;

/**
 * Maximum keyboard key name length accepted from one live-preview UI event.
 */
const MAX_LIVE_PAGE_PREVIEW_KEY_LENGTH = 40;

/**
 * Parsed live-preview interaction request body.
 */
type ParsedLivePagePreviewInteractionRequest = {
    readonly sessionId: string;
    readonly interaction: LivePagePreviewInteraction;
};

/**
 * Constant for dynamic route rendering.
 */
export const dynamic = 'force-dynamic';

/**
 * Applies one UI interaction to an active live browser preview.
 *
 * Requires authentication because interaction targets are opened by the authenticated preview route.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedRequest = await parseLivePagePreviewInteractionRequest(request);
    if (!parsedRequest) {
        return NextResponse.json({ error: 'Invalid live preview interaction request.' }, { status: 400 });
    }

    try {
        const isApplied = await applyLivePagePreviewInteraction(parsedRequest);
        if (!isApplied) {
            return NextResponse.json({ error: 'Live preview session not found.' }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        assertsError(error);
        console.error('Error applying live page preview interaction:', error);
        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}

/**
 * Parses and validates a live-preview interaction request.
 *
 * @param request - Incoming interaction request.
 * @returns Parsed request or null when the payload is invalid.
 */
async function parseLivePagePreviewInteractionRequest(
    request: NextRequest,
): Promise<ParsedLivePagePreviewInteractionRequest | null> {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return null;
    }

    if (!isRecord(body)) {
        return null;
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
    if (!sessionId || !isLivePagePreviewSessionId(sessionId)) {
        return null;
    }

    const interaction = parseLivePagePreviewInteraction(body);
    if (!interaction) {
        return null;
    }

    return {
        sessionId,
        interaction,
    };
}

/**
 * Parses one normalized live-preview interaction from an object payload.
 *
 * @param body - Request body record.
 * @returns Interaction payload or null when invalid.
 */
function parseLivePagePreviewInteraction(body: Record<string, unknown>): LivePagePreviewInteraction | null {
    if (body.type === 'click') {
        const x = readFiniteNumber(body.x);
        const y = readFiniteNumber(body.y);

        if (x === null || y === null) {
            return null;
        }

        return { type: 'click', x, y };
    }

    if (body.type === 'wheel') {
        const deltaX = readFiniteNumber(body.deltaX);
        const deltaY = readFiniteNumber(body.deltaY);

        if (deltaX === null || deltaY === null) {
            return null;
        }

        return {
            type: 'wheel',
            deltaX: clampWheelDelta(deltaX),
            deltaY: clampWheelDelta(deltaY),
        };
    }

    if (body.type === 'keyDown') {
        const key = typeof body.key === 'string' ? body.key : null;
        if (!key || key.length > MAX_LIVE_PAGE_PREVIEW_KEY_LENGTH) {
            return null;
        }

        return { type: 'keyDown', key };
    }

    return null;
}

/**
 * Checks whether a value is a plain object record.
 *
 * @param value - Candidate value.
 * @returns True when the value can be read as a JSON object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one finite number from a JSON value.
 *
 * @param value - Candidate JSON value.
 * @returns Number or null when invalid.
 */
function readFiniteNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return value;
}

/**
 * Clamps one wheel delta to a bounded value.
 *
 * @param value - Raw wheel delta.
 * @returns Delta safe to forward to Playwright.
 */
function clampWheelDelta(value: number): number {
    return Math.min(Math.max(value, -MAX_LIVE_PAGE_PREVIEW_WHEEL_DELTA), MAX_LIVE_PAGE_PREVIEW_WHEEL_DELTA);
}
