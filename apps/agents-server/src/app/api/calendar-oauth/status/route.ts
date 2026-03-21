import { listCalendarConnections } from '@/src/utils/calendars';
import { loadGoogleCalendarOAuthConfiguration } from '@/src/utils/googleCalendarOAuth';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import {
    resolveUseCalendarGoogleOAuthTokenPayloadFromWallet,
    resolveUseCalendarGoogleTokenFromWallet,
} from '@/src/utils/userWallet';
import { NextResponse } from 'next/server';

/**
 * Returns Google Calendar OAuth configuration/connection status for current user.
 */
export async function GET(request: Request) {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const agentPermanentId = normalizeOptionalText(requestUrl.searchParams.get('agentPermanentId')) || undefined;

    try {
        const configuration = await loadGoogleCalendarOAuthConfiguration();
        const isConfigured = Boolean(configuration);
        if (!isConfigured) {
            return NextResponse.json({
                isConfigured: false,
                isConnected: false,
                hasUsableToken: false,
                connectionCount: 0,
            });
        }

        const [oauthTokenPayload, manualToken, resolvedToken, calendarConnections] = await Promise.all([
            resolveUseCalendarGoogleOAuthTokenPayloadFromWallet({
                userId: identity.userId,
                agentPermanentId,
            }),
            resolveUseCalendarGoogleTokenFromWallet({
                userId: identity.userId,
                agentPermanentId,
            }),
            resolveUseCalendarGoogleToken({
                userId: identity.userId,
                agentPermanentId,
            }),
            listCalendarConnections({
                userId: identity.userId,
                agentPermanentId,
                provider: 'google',
            }),
        ]);

        return NextResponse.json({
            isConfigured,
            isConnected: Boolean(oauthTokenPayload || manualToken || calendarConnections.length > 0),
            hasUsableToken: Boolean(resolvedToken),
            connectionCount: calendarConnections.length,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to resolve Calendar OAuth status.' },
            { status: 500 },
        );
    }
}

/**
 * Normalizes one optional textual query value.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

