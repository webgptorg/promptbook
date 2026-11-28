import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';

/**
 * Default Sentry project DSN for Promptbook Agents Server telemetry.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export const DEFAULT_SENTRY_DSN =
    'https://986f734e9cddaeeec33e2a360f7d0b62@o4508778158030848.ingest.de.sentry.io/4511534509785168';

/**
 * Sentry organization slug used by build-time SDK tooling.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export const SENTRY_ORGANIZATION = 'promptbook';

/**
 * Sentry project slug used by build-time SDK tooling.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export const SENTRY_PROJECT = 's22';

/**
 * Performance tracing sample rate requested for the Agents Server.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export const SENTRY_TRACES_SAMPLE_RATE = 1.0;

/**
 * Browser-side targets that should receive distributed tracing headers.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export const SENTRY_TRACE_PROPAGATION_TARGETS: Array<string | RegExp> = [
    'localhost',
    /^\/api\//,
    /^https:\/\/.*\.ptbk\.io\/api\//,
    /^https:\/\/.*\.vercel\.app\/api\//,
];

/**
 * Release name used for Agents Server Sentry events.
 */
const AGENTS_SERVER_SENTRY_RELEASE_NAME = 'promptbook-agents-server';

/**
 * Fallback text used in Sentry tags when a value is not configured.
 */
const UNKNOWN_SENTRY_CONTEXT_VALUE = 'unknown';

/**
 * Maximum length kept for Sentry tag values.
 */
const MAX_SENTRY_TAG_VALUE_LENGTH = 200;

/**
 * Resolves the browser-safe Sentry DSN.
 *
 * @returns Browser-safe Sentry DSN.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function resolveBrowserSentryDsn(): string {
    return process.env.NEXT_PUBLIC_SENTRY_DSN ?? DEFAULT_SENTRY_DSN;
}

/**
 * Resolves the server-side Sentry DSN.
 *
 * @returns Server-side Sentry DSN.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function resolveServerSentryDsn(): string {
    return process.env.SENTRY_DSN ?? resolveBrowserSentryDsn();
}

/**
 * Resolves the most specific deployment environment name available.
 *
 * @returns Environment name suitable for Sentry.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function resolveSentrySdkEnvironment(): string {
    return (
        getFirstNonEmptyString(
            process.env.SENTRY_ENVIRONMENT,
            process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV,
            process.env.VERCEL_TARGET_ENV,
            process.env.NEXT_PUBLIC_VERCEL_ENV,
            process.env.VERCEL_ENV,
            process.env.PROMPTBOOK_REPOSITORY_REF,
            process.env.NODE_ENV,
        ) ?? UNKNOWN_SENTRY_CONTEXT_VALUE
    );
}

/**
 * Resolves the current deployment commit hash from common hosting environment variables.
 *
 * @returns Commit hash or null when unavailable.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function resolveSentrySdkCommitHash(): string | null {
    return getFirstNonEmptyString(
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
        process.env.VERCEL_GIT_COMMIT_SHA,
        process.env.PROMPTBOOK_COMMIT_SHA,
        process.env.GIT_COMMIT_SHA,
        process.env.COMMIT_SHA,
        process.env.SOURCE_VERSION,
    );
}

/**
 * Resolves the current repository branch or deployment ref.
 *
 * @returns Repository branch/ref or null when unavailable.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function resolveSentrySdkRepositoryBranch(): string | null {
    return getFirstNonEmptyString(
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
        process.env.VERCEL_GIT_COMMIT_REF,
        process.env.PROMPTBOOK_REPOSITORY_REF,
        process.env.GIT_BRANCH,
        process.env.BRANCH_NAME,
    );
}

/**
 * Resolves the Sentry release name for the current Agents Server build.
 *
 * @returns Release identifier suitable for Sentry.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function resolveSentrySdkRelease(): string {
    const appPackageVersion = normalizeOptionalString(process.env.npm_package_version) ?? PROMPTBOOK_ENGINE_VERSION;
    const commitHash = resolveSentrySdkCommitHash();

    if (!commitHash) {
        return `${AGENTS_SERVER_SENTRY_RELEASE_NAME}@${appPackageVersion}`;
    }

    return `${AGENTS_SERVER_SENTRY_RELEASE_NAME}@${appPackageVersion}+${commitHash}`;
}

/**
 * Creates shared filterable Sentry tags for Agents Server events.
 *
 * @returns Sanitized Sentry tags.
 *
 * @private internal Sentry SDK configuration for Agents Server
 */
export function createSentrySdkTags(): Record<string, string> {
    return createSentryTags({
        promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        bookLanguageVersion: BOOK_LANGUAGE_VERSION,
        appPackageVersion: normalizeOptionalString(process.env.npm_package_version) ?? PROMPTBOOK_ENGINE_VERSION,
        commitHash: resolveSentrySdkCommitHash(),
        repositoryBranch: resolveSentrySdkRepositoryBranch(),
        deploymentEnvironment: resolveSentrySdkEnvironment(),
        vercelEnvironment: getFirstNonEmptyString(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.VERCEL_ENV),
        targetEnvironment: getFirstNonEmptyString(
            process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV,
            process.env.VERCEL_TARGET_ENV,
        ),
        nextRuntime: process.env.NEXT_RUNTIME,
        nodeEnvironment: process.env.NODE_ENV,
        vercelRegion: process.env.VERCEL_REGION,
    });
}

/**
 * Creates Sentry tag values, preserving missing values as explicit `unknown` markers.
 *
 * @param values - Raw tag values.
 * @returns Sanitized Sentry tags.
 */
function createSentryTags(values: Record<string, string | null | undefined>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, sanitizeSentryTagValue(value)]),
    ) as Record<string, string>;
}

/**
 * Normalizes one value for use as a Sentry tag.
 *
 * @param value - Optional tag value.
 * @returns Non-empty bounded tag value.
 */
function sanitizeSentryTagValue(value: string | null | undefined): string {
    const normalizedValue = normalizeOptionalString(value) ?? UNKNOWN_SENTRY_CONTEXT_VALUE;

    return normalizedValue.replace(/\s+/gu, ' ').slice(0, MAX_SENTRY_TAG_VALUE_LENGTH);
}

/**
 * Returns the first non-empty string from a list.
 *
 * @param values - Candidate values in priority order.
 * @returns First trimmed string or null.
 */
function getFirstNonEmptyString(...values: Array<string | null | undefined>): string | null {
    for (const value of values) {
        const normalizedValue = normalizeOptionalString(value);

        if (normalizedValue) {
            return normalizedValue;
        }
    }

    return null;
}

/**
 * Trims one optional environment value.
 *
 * @param value - Raw optional value.
 * @returns Trimmed string or null.
 */
function normalizeOptionalString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue || null;
}
