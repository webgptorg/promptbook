import type { GoogleCalendarOAuthConfiguration } from './GoogleCalendarOAuthConfiguration';

/**
 * Builds Google OAuth consent URL for calendar access flow.
 */
export function buildGoogleCalendarOAuthConnectUrl(options: {
    state: string;
    scopes: string[];
    configuration: GoogleCalendarOAuthConfiguration;
}): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', options.configuration.clientId);
    url.searchParams.set('redirect_uri', options.configuration.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', options.scopes.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', options.state);

    return url.toString();
}
