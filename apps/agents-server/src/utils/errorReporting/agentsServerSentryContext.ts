import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import {
    createSentrySdkTags,
    resolveSentrySdkCommitHash,
    resolveSentrySdkEnvironment,
    resolveSentrySdkRelease,
    resolveSentrySdkRepositoryBranch,
} from './sentrySdkConfig';
import type { SentryStorePayload } from './sentryStore';

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
 *
 * @private internal helper for Agents Server Sentry reporting
 */
export function createAgentsServerSentryContext(): AgentsServerSentryContext {
    const deploymentEnvironment = resolveSentrySdkEnvironment();
    const appPackageVersion = normalizeOptionalString(process.env.npm_package_version) ?? PROMPTBOOK_ENGINE_VERSION;
    const commitHash = resolveSentrySdkCommitHash();
    const repositoryBranch = resolveSentrySdkRepositoryBranch();
    const memoryUsage = process.memoryUsage();

    return {
        release: resolveSentrySdkRelease(),
        environment: deploymentEnvironment,
        tags: createSentrySdkTags(),
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
