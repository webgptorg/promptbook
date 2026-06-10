/**
 * Sentry protocol version used for store endpoint requests.
 */
const SENTRY_PROTOCOL_VERSION = '7';

/**
 * Endpoint content type used when sending JSON payloads to Sentry.
 */
const JSON_CONTENT_TYPE = 'application/json';

/**
 * Number of milliseconds in one second.
 */
const MILLISECONDS_IN_SECOND = 1000;

/**
 * Minimal Sentry DSN parts needed for store endpoint requests.
 */
type SentryDsnParts = {
    /**
     * Store endpoint derived from DSN host/project.
     */
    storeEndpoint: URL;
};

/**
 * Payload shape submitted to the Sentry store endpoint.
 */
export type SentryStorePayload = {
    /**
     * Event platform.
     */
    platform: 'javascript';

    /**
     * Event level.
     */
    level: 'error';

    /**
     * Logger name visible in Sentry events.
     */
    logger: string;

    /**
     * Seconds since UNIX epoch.
     */
    timestamp: number;

    /**
     * Human readable message.
     */
    message: string;

    /**
     * Server/deployment name.
     */
    server_name: string;

    /**
     * Optional diagnostic tags used for filtering.
     */
    tags?: Record<string, string>;

    /**
     * Optional structured exception details.
     */
    exception?: {
        /**
         * Individual exception list.
         */
        values: Array<{
            /**
             * Exception type.
             */
            type: string;

            /**
             * Exception message.
             */
            value: string;
        }>;
    };

    /**
     * Optional additional diagnostic payload.
     */
    extra?: Record<string, unknown>;
};

/**
 * Resolves Sentry DSN from environment when configured.
 *
 * @returns Raw DSN string or `null` when telemetry is not configured.
 */
export function resolveOptionalSentryDsn(): string | null {
    return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? null;
}

/**
 * Resolves Sentry DSN from environment.
 *
 * @returns Raw DSN string.
 * @throws Error when DSN is missing.
 */
export function resolveRequiredSentryDsn(): string {
    const sentryDsn = resolveOptionalSentryDsn();

    if (!sentryDsn) {
        throw new Error('Missing Sentry DSN. Configure SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN.');
    }

    return sentryDsn;
}

/**
 * Parses a DSN into pieces required for Sentry store API requests.
 *
 * @param sentryDsn - Raw Sentry DSN.
 * @returns Parsed DSN details.
 * @throws Error when DSN format is invalid.
 */
function parseSentryDsn(sentryDsn: string): SentryDsnParts {
    const sentryDsnUrl = new URL(sentryDsn);
    const pathSegments = sentryDsnUrl.pathname.split('/').filter(Boolean);
    const projectId = pathSegments.at(-1);
    const pathPrefix = pathSegments.slice(0, -1).join('/');

    if (!projectId) {
        throw new Error('Invalid Sentry DSN: missing project ID.');
    }

    if (!sentryDsnUrl.username) {
        throw new Error('Invalid Sentry DSN: missing public key.');
    }

    const basePath = pathPrefix ? `/${pathPrefix}` : '';
    const storeEndpoint = new URL(`${sentryDsnUrl.protocol}//${sentryDsnUrl.host}${basePath}/api/${projectId}/store/`);
    storeEndpoint.searchParams.set('sentry_key', sentryDsnUrl.username);
    storeEndpoint.searchParams.set('sentry_version', SENTRY_PROTOCOL_VERSION);

    return {
        storeEndpoint,
    };
}

/**
 * Creates a current Sentry timestamp expressed in seconds.
 *
 * @returns Current event timestamp in seconds.
 */
export function createSentryTimestamp(): number {
    return Date.now() / MILLISECONDS_IN_SECOND;
}

/**
 * Sends one Sentry store payload.
 *
 * @param payload - Fully constructed Sentry store payload.
 * @param sentryDsn - Raw Sentry DSN used to derive the store endpoint.
 */
export async function sendSentryStorePayload(payload: SentryStorePayload, sentryDsn: string): Promise<void> {
    const { storeEndpoint } = parseSentryDsn(sentryDsn);

    const response = await fetch(storeEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': JSON_CONTENT_TYPE,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Sentry rejected error report (${response.status}): ${responseBody}`);
    }
}
