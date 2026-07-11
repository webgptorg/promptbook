/**
 * Browser-safe environment option returned by the update API.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateEnvironmentOption = {
    readonly id: string;
    readonly branch: string;
    readonly label: string;
    readonly description: string;
    readonly isCustom: boolean;
};

/**
 * Browser-safe database migration status recorded during one self-update job.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateDatabaseMigrationStatus =
    | 'pending'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'skipped'
    | 'unknown';

/**
 * Browser-safe database migration summary for one table prefix.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateDatabaseMigrationPrefixSummary = {
    readonly prefix: string;
    readonly appliedCount: number;
    readonly appliedMigrationFiles: ReadonlyArray<string>;
};

/**
 * Browser-safe database migration snapshot recorded during one self-update job.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateDatabaseMigrationSnapshot = {
    readonly status: UpdateDatabaseMigrationStatus;
    readonly processedPrefixes: ReadonlyArray<string>;
    readonly totalMigrationFiles: number | null;
    readonly perPrefix: ReadonlyArray<UpdateDatabaseMigrationPrefixSummary>;
    readonly isSkippedDueToActiveMigrationLock: boolean | null;
    readonly errorMessage: string | null;
    readonly summaryFilePath: string | null;
};

/**
 * Browser-safe latest update-job snapshot.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateJobSnapshot = {
    readonly jobId: string | null;
    readonly status: 'idle' | 'running' | 'succeeded' | 'failed';
    readonly trigger: 'manual' | 'automatic';
    readonly pid: number | null;
    readonly targetBranch: string | null;
    readonly targetEnvironment: UpdateEnvironmentOption;
    readonly currentStep: string | null;
    readonly currentCommitSha: string | null;
    readonly targetCommitSha: string | null;
    readonly errorMessage: string | null;
    readonly startedAt: string | null;
    readonly finishedAt: string | null;
    readonly isStale: boolean;
    readonly logTail: string | null;
    readonly logFilePath: string | null;
    readonly databaseMigrations: UpdateDatabaseMigrationSnapshot;
};

/**
 * Browser-safe automatic self-update configuration.
 *
 * @private type of `<UpdateClient/>`
 */
export type AutomaticUpdateConfiguration = {
    readonly isEnabled: boolean;
    readonly environment: UpdateEnvironmentOption;
    readonly cronExpression: string;
};

/**
 * Browser-safe summary of one installed Agents Server version.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateInstalledVersion = {
    readonly name: string;
    readonly directoryPath: string;
    readonly modifiedAt: string | null;
    readonly isCurrent: boolean;
};

/**
 * Browser-safe summary of one commit between the deployed checkout and the latest remote commit.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdatePendingCommit = {
    readonly commitSha: string;
    readonly shortCommitSha: string;
    readonly subject: string;
    readonly authoredAt: string | null;
};

/**
 * Browser-safe self-update overview returned by the super-admin API.
 *
 * @private type of `<UpdateClient/>`
 */
export type UpdateOverview = {
    readonly isAvailable: boolean;
    readonly unavailableReason: string | null;
    readonly environments: ReadonlyArray<UpdateEnvironmentOption>;
    readonly currentEnvironment: UpdateEnvironmentOption;
    readonly repositoryDirectory: string | null;
    readonly currentCommitSha: string | null;
    readonly currentCommitShortSha: string | null;
    readonly currentCommitMessage: string | null;
    readonly currentCommitDate: string | null;
    readonly latestRemoteCommitSha: string | null;
    readonly latestRemoteCommitShortSha: string | null;
    readonly latestRemoteCommitDate: string | null;
    readonly latestRemoteCommitMessage: string | null;
    readonly commitsBehindCount: number | null;
    readonly pendingCommits: ReadonlyArray<UpdatePendingCommit>;
    readonly isUpdateAvailable: boolean;
    readonly originRepositoryUrl: string;
    readonly isOriginRepositoryDefault: boolean;
    readonly defaultOriginRepositoryUrl: string;
    readonly automaticConfiguration: AutomaticUpdateConfiguration;
    readonly installedVersions: ReadonlyArray<UpdateInstalledVersion>;
    readonly garbageCollectionKeepVersionsCount: number;
    readonly job: UpdateJobSnapshot;
    readonly error?: string;
};
