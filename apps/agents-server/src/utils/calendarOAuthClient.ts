/**
 * Calendar OAuth status payload returned by `/api/calendar-oauth/status`.
 */
export type CalendarOAuthStatusResponse = {
    isConfigured: boolean;
    isConnected: boolean;
    hasUsableToken: boolean;
    connectionCount: number;
};

/**
 * Loads Calendar OAuth status for current user.
 */
export async function fetchCalendarOAuthStatus(agentPermanentId?: string): Promise<CalendarOAuthStatusResponse> {
    const query = new URLSearchParams();
    if (agentPermanentId) {
        query.set('agentPermanentId', agentPermanentId);
    }

    const response = await fetch(`/api/calendar-oauth/status?${query.toString()}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        return {
            isConfigured: false,
            isConnected: false,
            hasUsableToken: false,
            connectionCount: 0,
        };
    }

    const payload = (await response.json().catch(() => null)) as Partial<CalendarOAuthStatusResponse> | null;
    return {
        isConfigured: payload?.isConfigured === true,
        isConnected: payload?.isConnected === true,
        hasUsableToken: payload?.hasUsableToken === true,
        connectionCount: typeof payload?.connectionCount === 'number' ? payload.connectionCount : 0,
    };
}

/**
 * Builds `/api/calendar-oauth/connect` URL for redirecting the browser.
 */
export function buildCalendarOAuthConnectUrl(options: {
    returnTo: string;
    isGlobal: boolean;
    isUserScoped: boolean;
    calendarUrl: string;
    scopes: string[];
    agentPermanentId?: string | null;
}): string {
    const query = new URLSearchParams();
    query.set('returnTo', options.returnTo);
    query.set('scope', options.isGlobal ? 'global' : 'agent');
    query.set('userScope', options.isUserScoped ? 'true' : 'false');
    query.set('calendarUrl', options.calendarUrl);
    query.set('scopes', options.scopes.join(','));

    if (!options.isGlobal && options.agentPermanentId) {
        query.set('agentPermanentId', options.agentPermanentId);
    }

    return `/api/calendar-oauth/connect?${query.toString()}`;
}

/**
 * Triggers `/api/calendar-oauth/refresh` for current user and optional agent scope.
 */
export async function refreshCalendarOAuthToken(agentPermanentId?: string): Promise<boolean> {
    const response = await fetch('/api/calendar-oauth/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            ...(agentPermanentId ? { agentPermanentId } : {}),
        }),
    });
    if (!response.ok) {
        return false;
    }

    const payload = (await response.json().catch(() => null)) as { hasUsableToken?: unknown } | null;
    return payload?.hasUsableToken === true;
}

/**
 * Triggers `/api/calendar-oauth/revoke` for current user and selected connection scope.
 */
export async function revokeCalendarOAuthConnection(options: {
    agentPermanentId?: string;
    connectionId?: number;
}): Promise<boolean> {
    const response = await fetch('/api/calendar-oauth/revoke', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            ...(options.agentPermanentId ? { agentPermanentId: options.agentPermanentId } : {}),
            ...(typeof options.connectionId === 'number' ? { connectionId: options.connectionId } : {}),
        }),
    });

    return response.ok;
}
