import { resolveVpsInstallerScriptPath } from '../vpsConfiguration';
import {
    readCurrentVpsSelfUpdateEnvironment,
    resolveManagedPromptbookRepositoryDirectory,
} from './vpsSelfUpdateConfiguration';
import { readVpsSelfUpdateAutomaticConfiguration } from './vpsSelfUpdateAutomaticConfiguration';
import { VPS_SELF_UPDATE_ENVIRONMENTS, type VpsSelfUpdateEnvironmentOption } from './vpsSelfUpdateEnvironment';
import {
    readConfiguredVpsSelfUpdateOriginRepositoryUrl,
    VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL,
} from './vpsSelfUpdateOriginRepository';
import { readPersistedVpsSelfUpdateJob } from './readPersistedVpsSelfUpdateJob';
import { resolveVpsSelfUpdateJobForOverview } from './resolveVpsSelfUpdateJobForOverview';
import {
    listVpsSelfUpdateInstalledVersions,
    readAgentsServerGcKeepVersionsCount,
} from './vpsSelfUpdateInstalledVersions';
import {
    abbreviateCommitSha,
    countCommitsBetween,
    listCommitsBetween,
    readCommitMetadataFromRepository,
    readLatestRemoteBranchCommitSha,
    refreshVpsSelfUpdateRemoteBranch,
} from './vpsSelfUpdateRepository';
import type { VpsSelfUpdateJobSnapshot, VpsSelfUpdateOverview } from './vpsSelfUpdateTypes';

/**
 * Reads the current standalone VPS self-update overview.
 *
 * @returns Browser-safe update summary for the super-admin UI.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateOverview(): Promise<VpsSelfUpdateOverview> {
    const currentEnvironment = await readCurrentVpsSelfUpdateEnvironment();
    const repositoryDirectory = await resolveManagedPromptbookRepositoryDirectory();
    const scriptPath = await resolveVpsInstallerScriptPath();
    const job = await readPersistedVpsSelfUpdateJob();
    const originRepositoryUrl = await readConfiguredVpsSelfUpdateOriginRepositoryUrl();
    const automaticConfiguration = await readVpsSelfUpdateAutomaticConfiguration();
    const installedVersions = await listVpsSelfUpdateInstalledVersions();
    const garbageCollectionKeepVersionsCount = await readAgentsServerGcKeepVersionsCount();

    if (process.platform !== 'linux') {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory,
            job,
            originRepositoryUrl,
            automaticConfiguration,
            installedVersions,
            garbageCollectionKeepVersionsCount,
            unavailableReason: 'Self-update is available only on the standalone Linux VPS deployment.',
        });
    }

    if (!scriptPath) {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory,
            job,
            originRepositoryUrl,
            automaticConfiguration,
            installedVersions,
            garbageCollectionKeepVersionsCount,
            unavailableReason: 'The shared VPS installer script could not be found on this server.',
        });
    }

    if (!repositoryDirectory) {
        return createUnavailableOverview({
            currentEnvironment,
            repositoryDirectory: null,
            job,
            originRepositoryUrl,
            automaticConfiguration,
            installedVersions,
            garbageCollectionKeepVersionsCount,
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
        automaticConfiguration,
        installedVersions,
        garbageCollectionKeepVersionsCount,
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
    readonly automaticConfiguration: VpsSelfUpdateOverview['automaticConfiguration'];
    readonly installedVersions: VpsSelfUpdateOverview['installedVersions'];
    readonly garbageCollectionKeepVersionsCount: number;
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
        automaticConfiguration: context.automaticConfiguration,
        installedVersions: context.installedVersions,
        garbageCollectionKeepVersionsCount: context.garbageCollectionKeepVersionsCount,
        job: context.job,
    };
}
