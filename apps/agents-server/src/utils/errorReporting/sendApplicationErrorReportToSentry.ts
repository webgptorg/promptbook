import type { ApplicationErrorReportPayload } from './applicationErrorHandling';

/**
 * Sentry protocol version used for store endpoint requests.
 */
const SENTRY_PROTOCOL_VERSION = '7';

/**
 * Endpoint content type used when sending JSON payloads to Sentry.
 */
const JSON_CONTENT_TYPE = 'application/json';

/**
 * Logger name visible in Sentry events.
 */
const SENTRY_APPLICATION_ERROR_LOGGER = 'agents-server.application-error';

/**
 * Number of milliseconds in one second.
 */
const MILLISECONDS_IN_SECOND = 1000;

/**
 * Minimal Sentry DSN parts needed for store API requests.
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
type SentryStorePayload = {
    /**
     * Event platform.
     */
    platform: 'javascript';

    /**
     * Event level.
     */
    level: 'error';

    /**
     * Event logger value.
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
     * Diagnostic tags used for filtering.
     */
    tags: Record<string, string>;

    /**
     * Structured exception details.
     */
    exception: {
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
     * Additional diagnostic payload.
     */
    extra: Record<string, string | null>;
};

/**
 * Resolves Sentry DSN from environment.
 *
 * @returns Raw DSN string.
 * @throws Error when DSN is missing.
 */
function resolveSentryDsn(): string {
    const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
        throw new Error('Missing Sentry DSN. Configure SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN.');
    }

    return dsn;
}

/**
 * Parses a DSN into pieces required for Sentry store API requests.
 *
 * @param dsn - Raw Sentry DSN.
 * @returns Parsed DSN details.
 * @throws Error when DSN format is invalid.
 */
function parseSentryDsn(dsn: string): SentryDsnParts {
    const dsnUrl = new URL(dsn);
    const pathSegments = dsnUrl.pathname.split('/').filter(Boolean);
    const projectId = pathSegments.at(-1);
    const pathPrefix = pathSegments.slice(0, -1).join('/');

    if (!projectId) {
        throw new Error('Invalid Sentry DSN: missing project ID.');
    }

    if (!dsnUrl.username) {
        throw new Error('Invalid Sentry DSN: missing public key.');
    }

    const basePath = pathPrefix ? `/${pathPrefix}` : '';
    const storeEndpoint = new URL(`${dsnUrl.protocol}//${dsnUrl.host}${basePath}/api/${projectId}/store/`);
    storeEndpoint.searchParams.set('sentry_key', dsnUrl.username);
    storeEndpoint.searchParams.set('sentry_version', SENTRY_PROTOCOL_VERSION);

    return {
        storeEndpoint,
    };
}

/**
 * Creates the Sentry-compatible JSON payload from the application report.
 *
 * @param report - Browser-generated application error report.
 * @returns Sentry store payload.
 */
function createSentryStorePayload(report: ApplicationErrorReportPayload): SentryStorePayload {
    return {
        platform: 'javascript',
        level: 'error',
        logger: SENTRY_APPLICATION_ERROR_LOGGER,
        timestamp: Date.now() / MILLISECONDS_IN_SECOND,
        message: report.errorMessage,
        server_name: report.serverName,
        tags: {
            digest: report.digest,
            variant: report.variant,
            source: 'next-app-error-boundary',
        },
        exception: {
            values: [
                {
                    type: report.errorName,
                    value: report.errorMessage,
                },
            ],
        },
        extra: {
            nextDigest: report.nextDigest ?? null,
            stack: report.errorStack ?? null,
            pageUrl: report.pageUrl ?? null,
            reportedAt: report.reportedAt,
        },
    };
}

/**
 * Sends an application error report to Sentry.
 *
 * @param report - Structured browser report payload.
 */
export async function sendApplicationErrorReportToSentry(report: ApplicationErrorReportPayload): Promise<void> {
    const dsn = resolveSentryDsn();
    const { storeEndpoint } = parseSentryDsn(dsn);
    const payload = createSentryStorePayload(report);

    const response = await fetch(storeEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': JSON_CONTENT_TYPE,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Sentry rejected application error report (${response.status}): ${responseBody}`);
    }
}
