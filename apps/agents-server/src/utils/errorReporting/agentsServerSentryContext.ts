import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import type { SentryStorePayload } from './sentryStore';

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
 * Shared deployment and runtime context added to every Agents Server Sentry event.
 */
type AgentsServerSentryContext = {
    /**
     * Sentry release identifier.
     */
    readonly release: string;

    /**
     * Sentry environment identifier.
     */
    readonly environment: string;

    /**
     * Filterable Sentry tags.
     */
    readonly tags: Record<string, string>;

    /**
     * Full non-secret diagnostic context.
     */
    readonly extra: Record<string, unknown>;
};

/**
 * Adds shared Agents Server release, environment, version, deployment, git, and runtime details.
 *
 * @param payload - Event-specific Sentry payload.
 * @returns Payload enriched with common Agents Server diagnostics.
 *
 * @private internal helper for Agents Server Sentry reporting
 */
export function enrichSentryStorePayloadWithAgentsServerContext(payload: SentryStorePayload): SentryStorePayload {
    const context = createAgentsServerSentryContext();

    return {
        ...payload,
        release: context.release,
        environment: context.environment,
        tags: {
            ...context.tags,
            ...payload.tags,
        },
        extra: {
            ...context.extra,
            ...payload.extra,
        },
    };
}

/**
 * Creates a current Agents Server diagnostic context matching the admin About page metadata.
 *
 * @returns Common Sentry context for one event.
 */
function createAgentsServerSentryContext(): AgentsServerSentryContext {
    const deploymentEnvironment = resolveSentryEnvironment();
    const appPackageVersion = normalizeOptionalString(process.env.npm_package_version) ?? PROMPTBOOK_ENGINE_VERSION;
    const commitHash = resolveCommitHash();
    const repositoryBranch = resolveRepositoryBranch();
    const memoryUsage = process.memoryUsage();

    return {
        release: createSentryReleaseName(appPackageVersion, commitHash),
        environment: deploymentEnvironment,
        tags: createSentryTags({
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            bookLanguageVersion: BOOK_LANGUAGE_VERSION,
            appPackageVersion,
            commitHash,
            repositoryBranch,
            deploymentEnvironment,
            vercelEnvironment: getFirstNonEmptyString(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.VERCEL_ENV),
            targetEnvironment: getFirstNonEmptyString(
                process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV,
                process.env.VERCEL_TARGET_ENV,
            ),
            nextRuntime: process.env.NEXT_RUNTIME,
            nodeEnvironment: process.env.NODE_ENV,
            vercelRegion: process.env.VERCEL_REGION,
        }),
        extra: {
            agentsServer: {
                versions: {
                    promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                    bookLanguageVersion: BOOK_LANGUAGE_VERSION,
                    appPackageVersion,
                    appPackageName: normalizeOptionalString(process.env.npm_package_name),
                    nextBuildId: normalizeOptionalString(process.env.NEXT_BUILD_ID),
                    nextDistDirectory: normalizeOptionalString(process.env.NEXT_DIST_DIR),
                    npmLifecycleEvent: normalizeOptionalString(process.env.npm_lifecycle_event),
                    npmUserAgent: normalizeOptionalString(process.env.npm_config_user_agent),
                },
                deployment: {
                    environment: deploymentEnvironment,
                    vercelEnvironment: getFirstNonEmptyString(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.VERCEL_ENV),
                    targetEnvironment: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV,
                        process.env.VERCEL_TARGET_ENV,
                    ),
                    siteUrl: normalizeOptionalString(process.env.NEXT_PUBLIC_SITE_URL),
                    vercelUrl: getFirstNonEmptyString(process.env.NEXT_PUBLIC_VERCEL_URL, process.env.VERCEL_URL),
                    vercelBranchUrl: normalizeOptionalString(process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL),
                    vercelProductionUrl: normalizeOptionalString(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL),
                    vercelRegion: normalizeOptionalString(process.env.VERCEL_REGION),
                    repositoryRef: normalizeOptionalString(process.env.PROMPTBOOK_REPOSITORY_REF),
                    supabaseTablePrefix: normalizeOptionalString(process.env.SUPABASE_TABLE_PREFIX),
                    currentWorkingDirectory: process.cwd(),
                },
                git: {
                    provider: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_PROVIDER,
                        process.env.VERCEL_GIT_PROVIDER,
                    ),
                    repositoryOwner: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER,
                        process.env.VERCEL_GIT_REPO_OWNER,
                    ),
                    repositorySlug: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
                        process.env.VERCEL_GIT_REPO_SLUG,
                    ),
                    repositoryId: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_ID,
                        process.env.VERCEL_GIT_REPO_ID,
                    ),
                    commitHash,
                    previousCommitHash: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_PREVIOUS_SHA,
                        process.env.VERCEL_GIT_PREVIOUS_SHA,
                    ),
                    branch: repositoryBranch,
                    commitMessage: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE,
                        process.env.VERCEL_GIT_COMMIT_MESSAGE,
                    ),
                    authorName: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME,
                        process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME,
                    ),
                    authorLogin: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
                        process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
                    ),
                    pullRequestId: getFirstNonEmptyString(
                        process.env.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID,
                        process.env.VERCEL_GIT_PULL_REQUEST_ID,
                    ),
                },
                runtime: {
                    nodeVersion: process.version,
                    nodeEnvironment: normalizeOptionalString(process.env.NODE_ENV),
                    nextRuntime: normalizeOptionalString(process.env.NEXT_RUNTIME),
                    processId: process.pid,
                    processUptimeSeconds: process.uptime(),
                    hostname: getFirstNonEmptyString(process.env.HOSTNAME, process.env.COMPUTERNAME),
                    platform: process.platform,
                    architecture: process.arch,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                },
                memory: {
                    rssBytes: memoryUsage.rss,
                    heapUsedBytes: memoryUsage.heapUsed,
                    heapTotalBytes: memoryUsage.heapTotal,
                    externalBytes: memoryUsage.external,
                    arrayBuffersBytes: memoryUsage.arrayBuffers ?? 0,
                },
            },
        },
    };
}

/**
 * Resolves the most specific deployment environment name available.
 *
 * @returns Environment name suitable for Sentry.
 */
function resolveSentryEnvironment(): string {
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
 */
function resolveCommitHash(): string | null {
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
 */
function resolveRepositoryBranch(): string | null {
    return getFirstNonEmptyString(
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
        process.env.VERCEL_GIT_COMMIT_REF,
        process.env.PROMPTBOOK_REPOSITORY_REF,
        process.env.GIT_BRANCH,
        process.env.BRANCH_NAME,
    );
}

/**
 * Creates a Sentry release identifier from version and optional commit.
 *
 * @param appPackageVersion - Agents Server package version or Promptbook version fallback.
 * @param commitHash - Current deployment commit hash.
 * @returns Sentry release name.
 */
function createSentryReleaseName(appPackageVersion: string, commitHash: string | null): string {
    if (!commitHash) {
        return `${AGENTS_SERVER_SENTRY_RELEASE_NAME}@${appPackageVersion}`;
    }

    return `${AGENTS_SERVER_SENTRY_RELEASE_NAME}@${appPackageVersion}+${commitHash}`;
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
