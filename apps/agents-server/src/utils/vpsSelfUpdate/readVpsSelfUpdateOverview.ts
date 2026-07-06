import { resolveVpsInstallerScriptPath } from '../vpsConfiguration';
import {
    VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
    VPS_SELF_UPDATE_ENVIRONMENTS,
    type VpsSelfUpdateEnvironmentOption,
} from './vpsSelfUpdateEnvironments';
import {
    readConfiguredVpsSelfUpdateOriginRepositoryUrl,
    readCurrentVpsSelfUpdateEnvironment,
    resolveManagedPromptbookRepositoryDirectory,
} from './vpsSelfUpdateEnvironmentFile';
import {
    countCommitsBetween,
    listCommitsBetween,
    readCommitMetadataFromRepository,
    readLatestRemoteBranchCommitSha,
    refreshVpsSelfUpdateRemoteBranch,
} from './vpsSelfUpdateGit';
import { readPersistedVpsSelfUpdateJob, resolveVpsSelfUpdateJobForOverview } from './vpsSelfUpdateJob';
import type { VpsSelfUpdateJobSnapshot, VpsSelfUpdateOverview } from './vpsSelfUpdateTypes';

/**
 * Reads the current standalone VPS self-update overview.
 *
 * @returns Browser-safe update summary for the super-admin UI.
 */
export async function readVpsSelfUpdateOverview(): Promise<VpsSelfUpdateOverview> {
    const currentEnvironment = await readCurrentVpsSelfUpdateEnvironment();
    const repositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();
    const scriptPath = await resolveVpsInstallerScriptPath();
    const job = await readPersistedVpsSelfUpdateJob();
    const originRepositoryUrl = await readConfiguredVpsSelfUpdateOriginRepositoryUrl();

    if (process.platform !== 'linux') {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory,
            job,
            originRepositoryUrl,
            unavailableReason: 'Self-update is available only on the standalone Linux VPS deployment.',
        });
    }

    if (!scriptPath) {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory,
            job,
            originRepositoryUrl,
            unavailableReason: 'The shared VPS installer script could not be found on this server.',
        });
    }

    if (!repositoryDirectory) {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory: null,
            job,
            originRepositoryUrl,
            unavailableReason: 'The managed Promptbook repository directory is not configured on this server.',
        });
    }

    await refreshVpsSelfUpdateRemoteBranch(repositoryDirectory, currentEnvironment.branch, originRepositoryUrl);

    const [currentCommit, latestRemoteCommitSha] = await Promise.all([
        readCommitMetadataFromRepository(repositoryDirectory, 'HEAD'),
        readLatestRemoteBranchCommitSha(repositoryDirectory, currentEnvironment.branch, originRepositoryUrl),
    ]);
    const latestRemoteCommit = latestRemoteCommitSha
        ? await readCommitMetadataFromRepository(repositoryDirectory, latestRemoteCommitSha)
        : null;
    const currentCommitSha = currentCommit?.commitSha ?? null;
    const latestRemoteCommitResolvedSha = latestRemoteCommit?.commitSha ?? latestRemoteCommitSha;
    const commitsBehindCount =
        currentCommitSha && latestRemoteCommitResolvedSha
            ? await countCommitsBetween(repositoryDirectory, currentCommitSha, latestRemoteCommitResolvedSha)
            : null;
    const pendingCommits =
        currentCommitSha && latestRemoteCommitResolvedSha
            ? await listCommitsBetween(repositoryDirectory, currentCommitSha, latestRemoteCommitResolvedSha)
            : [];
    const resolvedJob = resolveVpsSelfUpdateJobForOverview(job, {
        currentEnvironment,
        currentCommitSha,
    });

    return {
        isAvailable: Boolean(currentCommitSha),
        unavailableReason: currentCommitSha ? null : 'The managed Promptbook repository checkout is not available.',
        environments: VPS_SELF_UPDATE_ENVIRONMENTS,
        currentEnvironment,
        repositoryDirectory,
        currentCommitSha,
        currentCommitShortSha: abbreviateCommitSha(currentCommitSha),
        currentCommitMessage: currentCommit?.subject ?? null,
        currentCommitDate: currentCommit?.authoredAt ?? null,
        latestRemoteCommitSha: latestRemoteCommitResolvedSha,
        latestRemoteCommitShortSha: abbreviateCommitSha(latestRemoteCommitResolvedSha),
        latestRemoteCommitDate: latestRemoteCommit?.authoredAt ?? null,
        latestRemoteCommitMessage: latestRemoteCommit?.subject ?? null,
        commitsBehindCount,
        pendingCommits,
        isUpdateAvailable: Boolean(
            currentCommitSha && latestRemoteCommitResolvedSha && currentCommitSha !== latestRemoteCommitResolvedSha,
        ),
        originRepositoryUrl,
        isOriginRepositoryDefault: originRepositoryUrl === VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        defaultOriginRepositoryUrl: VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        job: resolvedJob,
    };
}

/**
 * Builds the placeholder overview used when self-update is unavailable on the host.
 *
 * @param context - Fields shared across every unavailable-overview branch.
 * @returns Browser-safe placeholder overview.
 */
function createUnavailableOverview(context: {
    readonly currentEnvironment: VpsSelfUpdateEnvironmentOption;
    readonly repositoryDirectory: string | null;
    readonly job: VpsSelfUpdateJobSnapshot;
    readonly originRepositoryUrl: string;
    readonly unavailableReason: string;
}): VpsSelfUpdateOverview {
    return {
        isAvailable: false,
        unavailableReason: context.unavailableReason,
        environments: VPS_SELF_UPDATE_ENVIRONMENTS,
        currentEnvironment: context.currentEnvironment,
        repositoryDirectory: context.repositoryDirectory,
        currentCommitSha: null,
        currentCommitShortSha: null,
        currentCommitMessage: null,
        currentCommitDate: null,
        latestRemoteCommitSha: null,
        latestRemoteCommitShortSha: null,
        latestRemoteCommitDate: null,
        latestRemoteCommitMessage: null,
        commitsBehindCount: null,
        pendingCommits: [],
        isUpdateAvailable: false,
        originRepositoryUrl: context.originRepositoryUrl,
        isOriginRepositoryDefault: context.originRepositoryUrl === VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        defaultOriginRepositoryUrl: VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
        job: context.job,
    };
}

/**
 * Abbreviates a git sha for compact display.
 *
 * @param sha - Full commit sha.
 * @returns Short commit sha or `null`.
 */
function abbreviateCommitSha(sha: string | null): string | null {
    return sha ? sha.slice(0, 7) : null;
}
