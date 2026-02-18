/**
 * Supported presentation variants for the application error page.
 */
export type ApplicationErrorVariant = 'simple' | 'advanced';

/**
 * Next.js app error boundary payload.
 */
export type ApplicationBoundaryError = Error & { digest?: string };

/**
 * Canonical endpoint used by the application error boundary to report failures.
 */
export const APPLICATION_ERROR_REPORT_ENDPOINT = '/api/error-reports/application';

/**
 * Fallback server name used when deployment metadata is not configured.
 */
export const DEFAULT_APPLICATION_ERROR_SERVER_NAME = 'Promptbook Agents Server';

/**
 * Default application error variant when no explicit config is provided.
 */
export const DEFAULT_APPLICATION_ERROR_VARIANT: ApplicationErrorVariant = 'advanced';

/**
 * Raw text used when an exception does not include a stack or message.
 */
const UNKNOWN_ERROR_HASH_SOURCE = 'unknown error';

/**
 * Multiplicative factor used by the deterministic hash implementation.
 */
const ERROR_HASH_MULTIPLIER = 31;

/**
 * Number base for digest string formatting.
 */
const DECIMAL_BASE = 10;

/**
 * Length of the digest string rendered in the UI.
 */
const DIGEST_LENGTH = 10;

/**
 * Shape sent from the app error boundary to server-side Sentry forwarding.
 */
export type ApplicationErrorReportPayload = {
    /**
     * Active presentation variant.
     */
    variant: ApplicationErrorVariant;

    /**
     * Friendly server name shown in the UI.
     */
    serverName: string;

    /**
     * Deterministic digest used for log and Sentry correlation.
     */
    digest: string;

    /**
     * Optional digest provided directly by Next.js.
     */
    nextDigest?: string;

    /**
     * Exception type name.
     */
    errorName: string;

    /**
     * Human readable exception message.
     */
    errorMessage: string;

    /**
     * Optional stack trace.
     */
    errorStack?: string;

    /**
     * Browser URL where the boundary rendered.
     */
    pageUrl?: string;

    /**
     * ISO timestamp created in the browser when reporting the error.
     */
    reportedAt: string;
};

/**
 * Creates the canonical application error headline.
 *
 * @param serverName - Friendly server name for the active deployment.
 * @returns Headline text rendered in both simple and advanced variants.
 */
export function createApplicationErrorHeadline(serverName: string): string {
    return `A server exception occurred while loading ${serverName}.`;
}

/**
 * Creates a deterministic digest so operators can correlate logs.
 *
 * @param error - Captured boundary exception.
 * @returns Digest string that can be copied by users.
 */
export function createApplicationErrorDigest(error: ApplicationBoundaryError | null): string {
    const nextDigest = error?.digest?.trim();
    if (nextDigest) {
        return nextDigest;
    }

    const hashSource = error?.stack ?? error?.message ?? UNKNOWN_ERROR_HASH_SOURCE;
    let hash = 0;

    for (let index = 0; index < hashSource.length; index += 1) {
        hash = Math.imul(ERROR_HASH_MULTIPLIER, hash) + hashSource.charCodeAt(index);
    }

    return (hash >>> 0).toString(DECIMAL_BASE).padStart(DIGEST_LENGTH, '0');
}

/**
 * Formats descriptive text shown beneath the application error headline.
 *
 * @param error - Captured boundary exception.
 * @param serverName - Friendly server name for the active deployment.
 * @returns Friendly summary of what happened.
 */
export function describeApplicationError(error: ApplicationBoundaryError | null, serverName: string): string {
    if (error?.message) {
        return `${error.message.trim()} - the server for ${serverName} logged this failure.`;
    }

    return `A server-side exception happened while loading ${serverName}. The logs captured more detail.`;
}

/**
 * Normalizes runtime configuration into a supported application error variant.
 *
 * @param configuredVariant - Raw config value from environment variables.
 * @returns Supported variant name.
 */
export function resolveApplicationErrorVariant(configuredVariant: string | undefined): ApplicationErrorVariant {
    return configuredVariant === 'simple' ? 'simple' : DEFAULT_APPLICATION_ERROR_VARIANT;
}

/**
 * Builds a serializable payload that can be sent to Sentry forwarding APIs.
 *
 * @param error - Boundary exception object.
 * @param digest - Stable digest for operator correlation.
 * @param serverName - Friendly server name used in UI and telemetry.
 * @param variant - Active application error presentation variant.
 * @param pageUrl - Browser URL where the error happened.
 * @returns Structured report payload ready for transport.
 */
export function createApplicationErrorReportPayload(
    error: ApplicationBoundaryError,
    digest: string,
    serverName: string,
    variant: ApplicationErrorVariant,
    pageUrl: string | undefined,
): ApplicationErrorReportPayload {
    return {
        variant,
        serverName,
        digest,
        nextDigest: error.digest,
        errorName: error.name || 'Error',
        errorMessage: error.message || 'Unknown application error',
        errorStack: error.stack,
        pageUrl,
        reportedAt: new Date().toISOString(),
    };
}
