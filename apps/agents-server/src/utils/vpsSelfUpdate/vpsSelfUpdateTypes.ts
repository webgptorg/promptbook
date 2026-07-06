import type { VpsSelfUpdateEnvironmentOption } from './vpsSelfUpdateEnvironments';

/**
 * Persisted self-update job status.
 */
export type VpsSelfUpdateJobStatus = 'idle' | 'running' | 'succeeded' | 'failed';

/**
 * Snapshot of the latest standalone VPS self-update job.
 */
export type VpsSelfUpdateJobSnapshot = {
    /**
     * Last known job status.
     */
    readonly status: VpsSelfUpdateJobStatus;
    /**
     * Background process id when available.
     */
    readonly pid: number | null;
    /**
     * Selected target branch for the running or last completed job.
     */
    readonly targetBranch: string | null;
    /**
     * Resolved target environment metadata.
     */
    readonly targetEnvironment: VpsSelfUpdateEnvironmentOption;
    /**
     * Human-readable current step.
     */
    readonly currentStep: string | null;
    /**
     * Current deployed commit recorded by the installer script.
     */
    readonly currentCommitSha: string | null;
    /**
     * Target remote commit recorded by the installer script.
     */
    readonly targetCommitSha: string | null;
    /**
     * Error message when the job failed.
     */
    readonly errorMessage: string | null;
    /**
     * Start time of the job in ISO format.
     */
    readonly startedAt: string | null;
    /**
     * Finish time of the job in ISO format.
     */
    readonly finishedAt: string | null;
    /**
     * Whether the job claims to be running even though its process is gone.
     */
    readonly isStale: boolean;
    /**
     * Tail of the persisted installer log.
     */
    readonly logTail: string | null;
    /**
     * Absolute log-file path when known.
     */
    readonly logFilePath: string | null;
};

/**
 * Browser-safe self-update overview shown on the Update page.
 */
export type VpsSelfUpdateOverview = {
    /**
     * Whether self-update can run on the current host.
     */
    readonly isAvailable: boolean;
    /**
     * Human-readable reason when self-update is unavailable.
     */
    readonly unavailableReason: string | null;
    /**
     * Available deployment environments.
     */
    readonly environments: ReadonlyArray<VpsSelfUpdateEnvironmentOption>;
    /**
     * Currently configured deployment environment.
     */
    readonly currentEnvironment: VpsSelfUpdateEnvironmentOption;
    /**
     * Absolute path to the managed Promptbook repository.
     */
    readonly repositoryDirectory: string | null;
    /**
     * Current local repository commit.
     */
    readonly currentCommitSha: string | null;
    /**
     * Short local repository commit.
     */
    readonly currentCommitShortSha: string | null;
    /**
     * Current local repository commit subject.
     */
    readonly currentCommitMessage: string | null;
    /**
     * Author timestamp of the currently deployed commit in ISO format.
     */
    readonly currentCommitDate: string | null;
    /**
     * Latest remote commit on the selected branch.
     */
    readonly latestRemoteCommitSha: string | null;
    /**
     * Short latest remote commit.
     */
    readonly latestRemoteCommitShortSha: string | null;
    /**
     * Author timestamp of the latest remote commit in ISO format.
     */
    readonly latestRemoteCommitDate: string | null;
    /**
     * Latest remote commit subject.
     */
    readonly latestRemoteCommitMessage: string | null;
    /**
     * Number of commits the deployed checkout is behind the latest remote commit, or `null` when unknown.
     */
    readonly commitsBehindCount: number | null;
    /**
     * Commits that the deployed checkout is behind the latest remote commit (newest first).
     */
    readonly pendingCommits: ReadonlyArray<VpsSelfUpdatePendingCommit>;
    /**
     * Whether the remote branch contains a newer commit than the deployed checkout.
     */
    readonly isUpdateAvailable: boolean;
    /**
     * Configured upstream repository URL (defaults to `webgptorg/promptbook`).
     */
    readonly originRepositoryUrl: string;
    /**
     * Whether the configured origin matches the default upstream repository.
     */
    readonly isOriginRepositoryDefault: boolean;
    /**
     * Default upstream repository URL.
     */
    readonly defaultOriginRepositoryUrl: string;
    /**
     * Latest persisted update-job state.
     */
    readonly job: VpsSelfUpdateJobSnapshot;
};

/**
 * Repository state used to resolve a persisted self-update job for the browser overview.
 */
export type VpsSelfUpdateJobOverviewContext = {
    /**
     * Environment currently configured in the running Agents Server.
     */
    readonly currentEnvironment: VpsSelfUpdateEnvironmentOption;
    /**
     * Current local repository commit observed by the running server.
     */
    readonly currentCommitSha: string | null;
};

/**
 * Request payload accepted by {@link startVpsSelfUpdate}.
 */
export type VpsSelfUpdateStartRequest = {
    /**
     * Predefined environment id (e.g. `production`) or `custom` to target an arbitrary ref.
     */
    readonly environmentId: string;
    /**
     * Optional arbitrary commit hash, tag, or branch used when `environmentId === 'custom'`.
     */
    readonly customRef?: string | null;
    /**
     * Optional override of the upstream repository URL (must be a `https://` git URL).
     */
    readonly originRepositoryUrl?: string | null;
};

/**
 * Browser-safe summary of one commit that the deployed checkout is behind the latest remote commit.
 */
export type VpsSelfUpdatePendingCommit = {
    /**
     * Full commit hash.
     */
    readonly commitSha: string;
    /**
     * Short commit hash (first 7 chars).
     */
    readonly shortCommitSha: string;
    /**
     * Single-line commit subject.
     */
    readonly subject: string;
    /**
     * Author timestamp in ISO format or `null` when unknown.
     */
    readonly authoredAt: string | null;
};

/**
 * Browser-safe summary of one commit that the super admin can pick from the custom-target picker.
 */
export type VpsSelfUpdateCandidateCommit = {
    /**
     * Full commit hash.
     */
    readonly commitSha: string;
    /**
     * Short commit hash (first 7 chars).
     */
    readonly shortCommitSha: string;
    /**
     * Single-line commit subject.
     */
    readonly subject: string;
    /**
     * Author name.
     */
    readonly authorName: string;
    /**
     * Author email.
     */
    readonly authorEmail: string;
    /**
     * Author timestamp in ISO format.
     */
    readonly authoredAt: string;
    /**
     * Branches that point at this commit (origin-prefixed names stripped).
     */
    readonly branches: ReadonlyArray<string>;
    /**
     * Tags that point at this commit.
     */
    readonly tags: ReadonlyArray<string>;
    /**
     * Whether at least one tag points at the commit (used to flag stable releases).
     */
    readonly isReleaseTag: boolean;
};

/**
 * Filter applied to the candidate-commit listing.
 */
export type VpsSelfUpdateCandidateCommitsFilter = {
    /**
     * Free-text search across subject, author name, hash, branch and tag names.
     */
    readonly searchText?: string | null;
    /**
     * Restrict to commits authored on or after this ISO date.
     */
    readonly authoredAfter?: string | null;
    /**
     * Restrict to commits authored on or before this ISO date.
     */
    readonly authoredBefore?: string | null;
    /**
     * Hard limit on returned commits (default 200).
     */
    readonly limit?: number | null;
};
