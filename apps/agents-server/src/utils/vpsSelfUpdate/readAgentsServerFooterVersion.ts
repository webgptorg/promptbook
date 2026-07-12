import { PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';
import {
    readConfiguredVpsSelfUpdateOriginRepositoryUrl,
    VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
} from './vpsSelfUpdateOriginRepository';
import { resolveManagedPromptbookRepositoryDirectory } from './vpsSelfUpdateConfiguration';
import { abbreviateCommitSha, readCommitMetadataFromRepository, runGitInRepository } from './vpsSelfUpdateRepository';

/**
 * Git tag pattern used for Promptbook/Agents Server release tags.
 *
 * @private constant of `vpsSelfUpdate`
 */
const AGENTS_SERVER_VERSION_TAG_PATTERN = /^v?[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;

/**
 * Generated version tag used when the local Git checkout does not expose reachable tags.
 *
 * @private constant of `vpsSelfUpdate`
 */
const DEFAULT_AGENTS_SERVER_VERSION_TAG = `v${PROMPTBOOK_ENGINE_VERSION}`;

/**
 * How long the Git-derived footer version summary stays cached.
 *
 * @private constant of `vpsSelfUpdate`
 */
const AGENTS_SERVER_FOOTER_VERSION_CACHE_TTL_MILLISECONDS = 60 * 1000;

/**
 * Git tag match patterns accepted by `git describe`.
 *
 * @private constant of `vpsSelfUpdate`
 */
const GIT_DESCRIBE_VERSION_TAG_MATCH_ARGUMENTS = ['--match', 'v[0-9]*', '--match', '[0-9]*'] as const;

/**
 * Cached footer version promise shared by concurrent layout renders.
 *
 * @private variable of `vpsSelfUpdate`
 */
let cachedAgentsServerFooterVersionPromise: Promise<AgentsServerFooterVersion> | null = null;

/**
 * Expiration timestamp for {@link cachedAgentsServerFooterVersionPromise}.
 *
 * @private variable of `vpsSelfUpdate`
 */
let cachedAgentsServerFooterVersionExpiresAt = 0;

/**
 * Lightweight Agents Server version summary consumed by the shared footer.
 *
 * @private type of `vpsSelfUpdate`
 */
export type AgentsServerFooterVersion = {
    /**
     * Release tag shown as the base Agents Server version.
     */
    readonly versionTag: string;
    /**
     * Display label, optionally including the deployed commit short hash.
     */
    readonly label: string;
    /**
     * Browser URL of the backing Git repository.
     */
    readonly repositoryUrl: string;
    /**
     * Browser URL linked from the footer version text.
     */
    readonly versionUrl: string;
    /**
     * Current deployed commit hash.
     */
    readonly currentCommitSha: string | null;
    /**
     * Current deployed commit short hash.
     */
    readonly currentCommitShortSha: string | null;
    /**
     * Commit hash that the release tag points to.
     */
    readonly versionCommitSha: string | null;
    /**
     * Release commit author timestamp in ISO format.
     */
    readonly releasedAt: string | null;
};

/**
 * Reads the footer version summary while caching the Git work outside the client footer render path.
 *
 * @returns Git-derived Agents Server version information safe to pass into the client footer.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readAgentsServerFooterVersion(): Promise<AgentsServerFooterVersion> {
    const now = Date.now();
    const cachedAgentsServerFooterVersion = cachedAgentsServerFooterVersionPromise;
    const isCacheFresh = cachedAgentsServerFooterVersion !== null && cachedAgentsServerFooterVersionExpiresAt > now;

    if (isCacheFresh) {
        return cachedAgentsServerFooterVersion;
    }

    cachedAgentsServerFooterVersionPromise = readUncachedAgentsServerFooterVersion();
    cachedAgentsServerFooterVersionExpiresAt = now + AGENTS_SERVER_FOOTER_VERSION_CACHE_TTL_MILLISECONDS;
    return cachedAgentsServerFooterVersionPromise;
}

/**
 * Formats the compact version label shown in the footer.
 *
 * @param options - Release tag and optional deployed commit short hash.
 * @returns Footer version label.
 *
 * @private utility of `vpsSelfUpdate`
 */
export function formatAgentsServerFooterVersionLabel(options: {
    readonly versionTag: string;
    readonly currentCommitShortSha: string | null;
}): string {
    if (!options.currentCommitShortSha) {
        return options.versionTag;
    }

    return `${options.versionTag} (${options.currentCommitShortSha})`;
}

/**
 * Normalizes a Git repository clone URL to a browser URL.
 *
 * @param repositoryUrl - Git clone URL.
 * @returns Browser URL for the repository.
 *
 * @private utility of `vpsSelfUpdate`
 */
export function normalizeGitRepositoryWebUrl(repositoryUrl: string): string {
    const normalizedRepositoryUrl = repositoryUrl
        .trim()
        .replace(/^git\+/u, '')
        .replace(/\.git$/u, '');
    return normalizedRepositoryUrl || VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL.replace(/\.git$/u, '');
}

/**
 * Normalizes a release version into the repository tag format.
 *
 * @param value - Raw tag or generated version.
 * @returns Normalized version tag or `null` when the value is not a release tag.
 *
 * @private utility of `vpsSelfUpdate`
 */
export function normalizeAgentsServerVersionTag(value: string | null | undefined): string | null {
    const trimmedValue = value?.trim() || '';
    if (!AGENTS_SERVER_VERSION_TAG_PATTERN.test(trimmedValue)) {
        return null;
    }

    return trimmedValue.startsWith('v') ? trimmedValue : `v${trimmedValue}`;
}

/**
 * Resolves the URL linked from the footer version text.
 *
 * @param options - Repository URL, tag, current commit and comparison state.
 * @returns Browser URL for the most specific Git reference.
 *
 * @private utility of `vpsSelfUpdate`
 */
export function resolveAgentsServerFooterVersionUrl(options: {
    readonly repositoryUrl: string;
    readonly versionTag: string;
    readonly currentCommitSha: string | null;
    readonly isCurrentCommitNewerThanVersionTag: boolean;
}): string {
    if (!options.repositoryUrl.startsWith('https://github.com/')) {
        return options.repositoryUrl;
    }

    if (options.isCurrentCommitNewerThanVersionTag && options.currentCommitSha) {
        return `${options.repositoryUrl}/commit/${options.currentCommitSha}`;
    }

    return `${options.repositoryUrl}/releases/tag/${encodeURIComponent(options.versionTag)}`;
}

/**
 * Reads the footer version summary without using the module-level cache.
 *
 * @returns Git-derived Agents Server version information.
 */
async function readUncachedAgentsServerFooterVersion(): Promise<AgentsServerFooterVersion> {
    const repositoryUrl = normalizeGitRepositoryWebUrl(await readFooterVersionOriginRepositoryUrl());
    const repositoryDirectory = await resolveAgentsServerFooterRepositoryDirectory();

    if (!repositoryDirectory) {
        return createFallbackAgentsServerFooterVersion(repositoryUrl);
    }

    const [currentCommit, versionTag] = await Promise.all([
        readCommitMetadataFromRepository(repositoryDirectory, 'HEAD'),
        readAgentsServerVersionTagFromRepository(repositoryDirectory),
    ]);
    const versionCommit = await readCommitMetadataFromRepository(repositoryDirectory, `${versionTag}^{commit}`);
    const currentCommitSha = currentCommit?.commitSha ?? readCurrentCommitShaFromEnvironment();
    const currentCommitShortSha = abbreviateCommitSha(currentCommitSha);
    const versionCommitSha = versionCommit?.commitSha ?? null;
    const isCurrentCommitNewerThanVersionTag = Boolean(
        currentCommitSha && versionCommitSha && currentCommitSha !== versionCommitSha,
    );
    const displayedCommitShortSha = isCurrentCommitNewerThanVersionTag ? currentCommitShortSha : null;

    return {
        versionTag,
        label: formatAgentsServerFooterVersionLabel({
            versionTag,
            currentCommitShortSha: displayedCommitShortSha,
        }),
        repositoryUrl,
        versionUrl: resolveAgentsServerFooterVersionUrl({
            repositoryUrl,
            versionTag,
            currentCommitSha,
            isCurrentCommitNewerThanVersionTag,
        }),
        currentCommitSha,
        currentCommitShortSha,
        versionCommitSha,
        releasedAt: versionCommit?.authoredAt ?? null,
    };
}

/**
 * Reads the configured origin URL without letting optional VPS configuration block footer rendering.
 *
 * @returns Configured origin URL or the default Promptbook repository.
 */
async function readFooterVersionOriginRepositoryUrl(): Promise<string> {
    try {
        return await readConfiguredVpsSelfUpdateOriginRepositoryUrl();
    } catch {
        return VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL;
    }
}

/**
 * Resolves a local Git checkout suitable for lightweight version metadata reads.
 *
 * @returns Repository directory or `null` when Git metadata is unavailable.
 */
async function resolveAgentsServerFooterRepositoryDirectory(): Promise<string | null> {
    const managedRepositoryDirectory = await resolveManagedPromptbookRepositoryDirectory().catch(() => null);
    const candidateDirectories = [
        managedRepositoryDirectory,
        process.env.PTBK_REPOSITORY_DIR?.trim() || null,
        process.cwd(),
    ];

    for (const candidateDirectory of candidateDirectories) {
        if (!candidateDirectory) {
            continue;
        }

        const gitRepositoryRoot = await runGitInRepository(candidateDirectory, ['rev-parse', '--show-toplevel']);
        if (gitRepositoryRoot) {
            return candidateDirectory;
        }
    }

    return null;
}

/**
 * Reads the nearest reachable release tag for the deployed checkout.
 *
 * @param repositoryDirectory - Repository checkout path.
 * @returns Normalized release tag.
 */
async function readAgentsServerVersionTagFromRepository(repositoryDirectory: string): Promise<string> {
    const describedTag = await runGitInRepository(repositoryDirectory, [
        'describe',
        '--tags',
        '--abbrev=0',
        ...GIT_DESCRIBE_VERSION_TAG_MATCH_ARGUMENTS,
        'HEAD',
    ]);

    return (
        normalizeAgentsServerVersionTag(describedTag) ??
        normalizeAgentsServerVersionTag(DEFAULT_AGENTS_SERVER_VERSION_TAG) ??
        DEFAULT_AGENTS_SERVER_VERSION_TAG
    );
}

/**
 * Reads the deployed commit hash from public deployment metadata when local Git is unavailable.
 *
 * @returns Commit hash or `null`.
 */
function readCurrentCommitShaFromEnvironment(): string | null {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() || null;
}

/**
 * Creates a resilient fallback when the server cannot inspect a Git checkout.
 *
 * @param repositoryUrl - Browser URL of the configured Git repository.
 * @returns Fallback footer version summary.
 */
function createFallbackAgentsServerFooterVersion(repositoryUrl: string): AgentsServerFooterVersion {
    const currentCommitSha = readCurrentCommitShaFromEnvironment();
    const versionTag =
        normalizeAgentsServerVersionTag(DEFAULT_AGENTS_SERVER_VERSION_TAG) ?? DEFAULT_AGENTS_SERVER_VERSION_TAG;

    return {
        versionTag,
        label: formatAgentsServerFooterVersionLabel({
            versionTag,
            currentCommitShortSha: null,
        }),
        repositoryUrl,
        versionUrl: resolveAgentsServerFooterVersionUrl({
            repositoryUrl,
            versionTag,
            currentCommitSha,
            isCurrentCommitNewerThanVersionTag: false,
        }),
        currentCommitSha,
        currentCommitShortSha: abbreviateCommitSha(currentCommitSha),
        versionCommitSha: null,
        releasedAt: null,
    };
}
