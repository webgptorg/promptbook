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
 * Prefix used for downloaded application error report filenames.
 */
const APPLICATION_ERROR_REPORT_FILENAME_PREFIX = 'application-error-report';

/**
 * File extension used by exported application error reports.
 */
const APPLICATION_ERROR_REPORT_FILENAME_EXTENSION = '.md';

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
 * Marker shown in markdown reports when optional values are missing.
 */
const MISSING_REPORT_VALUE_MARKDOWN = '_Unavailable_';

/**
 * Regex used to normalize report filenames to filesystem-friendly segments.
 */
const NON_FILENAME_CHARACTERS_PATTERN = /[^a-z0-9-]+/g;

/**
 * Regex used to merge repeated filename separators.
 */
const REPEATED_DASH_PATTERN = /-+/g;

/**
 * Regex used to trim separators from filename edges.
 */
const EDGE_DASH_PATTERN = /^-+|-+$/g;

/**
 * Regex used to sanitize code fence boundaries inside markdown blocks.
 */
const CODE_FENCE_PATTERN = /```/g;

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

/**
 * Normalizes one value for safe inclusion inside markdown fenced code blocks.
 *
 * @param value - Raw text value.
 * @returns Sanitized text that cannot prematurely terminate the fence.
 */
function sanitizeForCodeFence(value: string): string {
    return value.replace(CODE_FENCE_PATTERN, '\\`\\`\\`');
}

/**
 * Formats optional report values into consistent markdown output.
 *
 * @param value - Optional text value.
 * @returns Markdown-safe text or an explicit missing marker.
 */
function formatOptionalReportValue(value: string | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : MISSING_REPORT_VALUE_MARKDOWN;
}

/**
 * Converts arbitrary deployment names into filesystem-safe filename segments.
 *
 * @param value - Raw deployment/server name.
 * @returns Normalized lowercase segment without unsafe characters.
 */
function normalizeFilenameSegment(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(NON_FILENAME_CHARACTERS_PATTERN, '-')
        .replace(REPEATED_DASH_PATTERN, '-')
        .replace(EDGE_DASH_PATTERN, '');

    return normalized || 'server';
}

/**
 * Converts ISO timestamps into filesystem-safe sortable identifiers.
 *
 * @param reportedAt - Browser-side report timestamp.
 * @returns Safe timestamp segment usable inside filenames.
 */
function createFilenameTimestamp(reportedAt: string): string {
    const parsedTimestamp = new Date(reportedAt);
    const isoTimestamp = Number.isNaN(parsedTimestamp.getTime()) ? new Date().toISOString() : parsedTimestamp.toISOString();

    return isoTimestamp.replace(/[:.]/g, '-');
}

/**
 * Builds the markdown report text shown to users for copy/download actions.
 *
 * @param report - Structured browser report payload.
 * @param headline - User-facing title shown on the error page.
 * @param description - User-facing explanation shown on the error page.
 * @returns Markdown report with both friendly and low-level diagnostic context.
 */
export function createApplicationErrorReportMarkdown(
    report: ApplicationErrorReportPayload,
    headline: string,
    description: string,
): string {
    const payloadJson = JSON.stringify(report, null, 2);
    const errorMessage = formatOptionalReportValue(report.errorMessage);
    const errorStack = formatOptionalReportValue(report.errorStack);
    const pageUrl = formatOptionalReportValue(report.pageUrl);
    const nextDigest = formatOptionalReportValue(report.nextDigest);

    return [
        '# Application Error Report',
        '',
        '## Human Summary',
        sanitizeForCodeFence(headline.trim()),
        '',
        sanitizeForCodeFence(description.trim()),
        '',
        '## Correlation',
        `- Server: \`${sanitizeForCodeFence(report.serverName)}\``,
        `- Variant: \`${sanitizeForCodeFence(report.variant)}\``,
        `- Digest: \`${sanitizeForCodeFence(report.digest)}\``,
        `- Next.js digest: \`${sanitizeForCodeFence(nextDigest)}\``,
        `- Reported at (UTC): \`${sanitizeForCodeFence(report.reportedAt)}\``,
        '',
        '## Request Context',
        `- Page URL: \`${sanitizeForCodeFence(pageUrl)}\``,
        '',
        '## Exception',
        `- Name: \`${sanitizeForCodeFence(report.errorName)}\``,
        '',
        '### Message',
        '```text',
        sanitizeForCodeFence(errorMessage),
        '```',
        '',
        '### Stack Trace',
        '```text',
        sanitizeForCodeFence(errorStack),
        '```',
        '',
        '## Raw Report Payload',
        '```json',
        sanitizeForCodeFence(payloadJson),
        '```',
        '',
    ].join('\n');
}

/**
 * Creates a deterministic markdown filename for downloadable error reports.
 *
 * @param report - Structured browser report payload.
 * @returns Filesystem-safe filename ending with `.md`.
 */
export function createApplicationErrorReportFilename(report: ApplicationErrorReportPayload): string {
    const serverSegment = normalizeFilenameSegment(report.serverName);
    const timestampSegment = createFilenameTimestamp(report.reportedAt);

    return `${APPLICATION_ERROR_REPORT_FILENAME_PREFIX}-${serverSegment}-${timestampSegment}${APPLICATION_ERROR_REPORT_FILENAME_EXTENSION}`;
}
