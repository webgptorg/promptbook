import { getMetadataMap } from '@/src/database/getMetadata';

/**
 * Metadata keys storing Google Calendar OAuth configuration.
 */
const GOOGLE_CALENDAR_OAUTH_METADATA_KEYS = [
    'GOOGLE_CALENDAR_CLIENT_ID',
    'GOOGLE_CALENDAR_CLIENT_SECRET',
    'GOOGLE_CALENDAR_REDIRECT_URI',
    'GOOGLE_CALENDAR_STATE_SECRET',
] as const;

/**
 * One of the metadata keys that store Google Calendar OAuth configuration.
 */
type GoogleCalendarOAuthMetadataKey = (typeof GOOGLE_CALENDAR_OAUTH_METADATA_KEYS)[number];

/**
 * Parsed Google Calendar OAuth configuration.
 */
export type GoogleCalendarOAuthConfiguration = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    stateSecret: string;
};

/**
 * Loads Google Calendar OAuth configuration from server metadata or legacy environment values.
 */
export async function loadGoogleCalendarOAuthConfiguration(): Promise<GoogleCalendarOAuthConfiguration | null> {
    const metadata = await getMetadataMap(GOOGLE_CALENDAR_OAUTH_METADATA_KEYS);

    const clientId = getConfigurationValue({
        metadata,
        key: 'GOOGLE_CALENDAR_CLIENT_ID',
        fallback: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    });
    const clientSecret = getConfigurationValue({
        metadata,
        key: 'GOOGLE_CALENDAR_CLIENT_SECRET',
        fallback: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    });
    const redirectUri = getConfigurationValue({
        metadata,
        key: 'GOOGLE_CALENDAR_REDIRECT_URI',
        fallback: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    });
    const stateSecret = getConfigurationValue({
        metadata,
        key: 'GOOGLE_CALENDAR_STATE_SECRET',
        fallback: process.env.GOOGLE_CALENDAR_STATE_SECRET || process.env.ADMIN_PASSWORD,
    });

    if (!clientId || !clientSecret || !redirectUri || !stateSecret) {
        return null;
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
        stateSecret,
    };
}

/**
 * Ensures Google Calendar OAuth configuration exists and throws when it does not.
 */
export async function ensureGoogleCalendarOAuthConfiguration(): Promise<GoogleCalendarOAuthConfiguration> {
    const configuration = await loadGoogleCalendarOAuthConfiguration();
    if (!configuration) {
        throw new Error('Google Calendar OAuth is not configured.');
    }

    return configuration;
}

/**
 * Resolves one metadata/environment configuration value into a trimmed string.
 *
 * @private function of loadGoogleCalendarOAuthConfiguration
 */
function getConfigurationValue(options: {
    metadata: Record<string, string | null | undefined>;
    key: GoogleCalendarOAuthMetadataKey;
    fallback?: string;
}): string {
    return (options.metadata[options.key] ?? '').trim() || (options.fallback?.trim() || '');
}
