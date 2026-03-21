import {
    buildGoogleCalendarOAuthConnectUrl,
    createGoogleCalendarOAuthConnectionState,
    loadGoogleCalendarOAuthConfiguration,
    normalizeGoogleCalendarOAuthReturnToPath,
} from '@/src/utils/googleCalendarOAuth';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { NextResponse } from 'next/server';

/**
 * Starts Google Calendar OAuth connect flow for the current user.
 */
export async function GET(request: Request) {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configuration = await loadGoogleCalendarOAuthConfiguration();
    if (!configuration) {
        return NextResponse.json({ error: 'Google Calendar OAuth is not configured on this server.' }, { status: 503 });
    }

    const url = new URL(request.url);
    const requestedScope = url.searchParams.get('scope');
    const requestedUserScope = url.searchParams.get('userScope');
    const requestedAgentPermanentId = url.searchParams.get('agentPermanentId');
    const requestedCalendarUrl = url.searchParams.get('calendarUrl') || 'https://calendar.google.com/calendar/u/0/r';
    const requestedScopes = parseScopesQuery(url.searchParams.get('scopes'));
    const returnTo = normalizeGoogleCalendarOAuthReturnToPath(url.searchParams.get('returnTo') || undefined);
    const requestedIsGlobal = requestedScope !== 'agent';
    const requestedIsUserScoped = requestedUserScope === 'true';
    const requestedAgentId = requestedAgentPermanentId?.trim() || null;
    const isGlobal = requestedIsGlobal || !requestedAgentId;
    const agentPermanentId = isGlobal ? null : requestedAgentId;

    const state = await createGoogleCalendarOAuthConnectionState(
        {
            userId: identity.userId,
            returnTo,
            isUserScoped: requestedIsUserScoped,
            isGlobal,
            agentPermanentId,
            calendarUrl: requestedCalendarUrl,
            scopes: requestedScopes,
        },
        configuration,
    );
    const connectUrl = buildGoogleCalendarOAuthConnectUrl({
        state,
        scopes: requestedScopes,
        configuration,
    });

    return NextResponse.redirect(connectUrl);
}

/**
 * Parses optional comma-delimited scopes query into unique list.
 *
 * @private function of calendar-oauth/connect
 */
function parseScopesQuery(rawScopes: string | null): string[] {
    if (!rawScopes) {
        return ['https://www.googleapis.com/auth/calendar'];
    }

    const scopes = rawScopes
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean);

    return scopes.length > 0 ? [...new Set(scopes)] : ['https://www.googleapis.com/auth/calendar'];
}
