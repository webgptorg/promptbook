import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { NextResponse } from 'next/server';

/**
 * Triggers Google Calendar token resolution/refresh for current user and optional agent scope.
 */
export async function POST(request: Request) {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { agentPermanentId?: unknown } | null;
    const agentPermanentId = normalizeOptionalText(body?.agentPermanentId) || undefined;

    try {
        const accessToken = await resolveUseCalendarGoogleToken({
            userId: identity.userId,
            agentPermanentId,
        });
        return NextResponse.json({
            success: Boolean(accessToken),
            hasUsableToken: Boolean(accessToken),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to refresh calendar access token.' },
            { status: 500 },
        );
    }
}

/**
 * Normalizes unknown optional text values.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

