import { resolveVpsSelfUpdateEnvironment } from './vpsSelfUpdateEnvironment';
import { VPS_SELF_UPDATE_STALE_ERROR_MESSAGE } from './vpsSelfUpdateJobConstants';
import {
    decodeVpsSelfUpdateStatusField,
    readLastVpsSelfUpdateTextFileChunk,
    readVpsSelfUpdateStatusFile,
    readVpsSelfUpdateStatusFileModifiedAt,
    resolveVpsSelfUpdateLogFilePath,
} from './vpsSelfUpdateStateFiles';
import type {
    VpsSelfUpdateDatabaseMigrationSnapshot,
    VpsSelfUpdateDatabaseMigrationStatus,
    VpsSelfUpdateJobSnapshot,
    VpsSelfUpdateJobStatus,
} from './vpsSelfUpdateTypes';
import type { VpsSelfUpdateJobTrigger } from './vpsSelfUpdateTypes';

/**
 * Options for reading the shell-owned self-update status snapshot.
 */
type ReadPersistedVpsSelfUpdateJobOptions = {
    /**
     * Whether to include the log tail in the returned snapshot.
     */
    readonly isLogTailIncluded?: boolean;
};

/**
 * Status values accepted from the shell-owned database migration status field.
 */
const VPS_SELF_UPDATE_DATABASE_MIGRATION_STATUSES = new Set<VpsSelfUpdateDatabaseMigrationStatus>([
    'pending',
    'running',
    'succeeded',
    'failed',
    'skipped',
    'unknown',
]);

/**
 * Reads a lightweight snapshot of the currently persisted standalone VPS self-update job.
 *
 * Reads only the persisted status file and its log tail — no git access, no remote fetching —
 * so it is safe to call from frequent polling loops such as the admin task manager.
 *
 * @returns Parsed job snapshot (status `idle` when no job has ever been persisted).
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateJobSnapshot(): Promise<VpsSelfUpdateJobSnapshot> {
    return readPersistedVpsSelfUpdateJob({ isLogTailIncluded: false });
}

/**
 * Reads one persisted update-job snapshot from disk.
 *
 * @param options - Snapshot loading options.
 * @returns Parsed job snapshot.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readPersistedVpsSelfUpdateJob(
    options: ReadPersistedVpsSelfUpdateJobOptions = {},
): Promise<VpsSelfUpdateJobSnapshot> {
    const statusEntries = await readVpsSelfUpdateStatusFile();
    const jobId = statusEntries.get('JOB_ID') || null;
    const targetBranch = statusEntries.get('TARGET_REF') || null;
    const targetEnvironment = resolveVpsSelfUpdateEnvironment(targetBranch);
    const pid = parseNullableVpsSelfUpdateInteger(statusEntries.get('PID'));
    const currentStep = decodeVpsSelfUpdateStatusField(statusEntries.get('CURRENT_STEP_B64'));
    const errorMessage = decodeVpsSelfUpdateStatusField(statusEntries.get('ERROR_MESSAGE_B64'));
    const logFilePath = statusEntries.get('LOG_FILE') || resolveVpsSelfUpdateLogFilePath();
    const rawStatus = statusEntries.get('STATUS');
    const status = isVpsSelfUpdateJobStatus(rawStatus) ? rawStatus : 'idle';
    const rawTrigger = statusEntries.get('TRIGGER');
    const trigger = isVpsSelfUpdateJobTrigger(rawTrigger) ? rawTrigger : 'manual';
    const isStale = status === 'running' && pid !== null ? !(await isVpsSelfUpdateProcessAlive(pid)) : false;
    const databaseMigrations = parseVpsSelfUpdateDatabaseMigrationSnapshot(statusEntries, status);
    // A successful self-update restarts the server, which usually terminates the detached installer
    // before it can write its own `FINISHED_AT`. When such a run is now stale (running status, dead
    // process), fall back to the status file's last-write time so the real total update time is
    // still reported instead of a misleading zero-second duration.
    const recordedFinishedAt = statusEntries.get('FINISHED_AT') || null;
    const finishedAt = recordedFinishedAt || (isStale ? await readVpsSelfUpdateStatusFileModifiedAt() : null);

    return {
        jobId,
        status: isStale ? 'failed' : status,
        trigger,
        pid,
        targetBranch,
        targetEnvironment,
        currentStep,
        currentCommitSha: statusEntries.get('CURRENT_COMMIT') || null,
        targetCommitSha: statusEntries.get('TARGET_COMMIT') || null,
        errorMessage: isStale && !errorMessage ? VPS_SELF_UPDATE_STALE_ERROR_MESSAGE : errorMessage,
        startedAt: statusEntries.get('STARTED_AT') || null,
        finishedAt,
        isStale,
        logTail: options.isLogTailIncluded === false ? null : await readLastVpsSelfUpdateTextFileChunk(logFilePath),
        logFilePath,
        databaseMigrations,
    };
}

/**
 * Checks whether a detached update process is still alive.
 *
 * @param pid - Candidate process id.
 * @returns `true` when the process exists.
 */
async function isVpsSelfUpdateProcessAlive(pid: number): Promise<boolean> {
    if (!Number.isFinite(pid) || pid <= 0) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}

/**
 * Parses one optional integer field.
 *
 * @param value - Raw string value.
 * @returns Parsed integer or `null`.
 */
function parseNullableVpsSelfUpdateInteger(value: string | undefined): number | null {
    if (!value) {
        return null;
    }

    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

/**
 * Type guard for persisted job statuses.
 *
 * @param value - Raw status value.
 * @returns `true` when supported.
 */
function isVpsSelfUpdateJobStatus(value: string | undefined): value is VpsSelfUpdateJobStatus {
    return value === 'idle' || value === 'running' || value === 'succeeded' || value === 'failed';
}

/**
 * Type guard for persisted job triggers.
 *
 * @param value - Raw trigger value.
 * @returns `true` when supported.
 */
function isVpsSelfUpdateJobTrigger(value: string | undefined): value is VpsSelfUpdateJobTrigger {
    return value === 'manual' || value === 'automatic';
}

/**
 * Parses database migration status and summary fields from the shell-owned update status file.
 *
 * @param statusEntries - Parsed status-file fields.
 * @param jobStatus - Persisted self-update job status.
 * @returns Browser-safe database migration snapshot.
 */
function parseVpsSelfUpdateDatabaseMigrationSnapshot(
    statusEntries: ReadonlyMap<string, string>,
    jobStatus: VpsSelfUpdateJobStatus,
): VpsSelfUpdateDatabaseMigrationSnapshot {
    const rawStatus = statusEntries.get('DATABASE_MIGRATION_STATUS');
    const summaryFilePath = statusEntries.get('DATABASE_MIGRATION_SUMMARY_FILE') || null;
    const errorMessage = decodeVpsSelfUpdateStatusField(statusEntries.get('DATABASE_MIGRATION_ERROR_MESSAGE_B64'));
    const summary = parseVpsSelfUpdateDatabaseMigrationSummary(
        decodeVpsSelfUpdateStatusField(statusEntries.get('DATABASE_MIGRATION_SUMMARY_B64')),
    );

    return {
        status: isVpsSelfUpdateDatabaseMigrationStatus(rawStatus)
            ? rawStatus
            : resolveMissingVpsSelfUpdateDatabaseMigrationStatus(jobStatus),
        ...summary,
        errorMessage,
        summaryFilePath,
    };
}

/**
 * Parses the machine-readable migration summary produced by the migration CLI.
 *
 * @param rawSummary - JSON summary string from `PTBK_DATABASE_MIGRATION_SUMMARY_FILE`.
 * @returns Normalized migration summary fields.
 */
function parseVpsSelfUpdateDatabaseMigrationSummary(
    rawSummary: string | null,
): Pick<
    VpsSelfUpdateDatabaseMigrationSnapshot,
    'processedPrefixes' | 'totalMigrationFiles' | 'perPrefix' | 'isSkippedDueToActiveMigrationLock'
> {
    if (!rawSummary) {
        return createEmptyVpsSelfUpdateDatabaseMigrationSummary();
    }

    try {
        const parsedSummary = JSON.parse(rawSummary) as unknown;
        if (!isRecord(parsedSummary)) {
            return createEmptyVpsSelfUpdateDatabaseMigrationSummary();
        }

        return {
            processedPrefixes: parseStringArray(parsedSummary.processedPrefixes),
            totalMigrationFiles: parseNullableNonNegativeInteger(parsedSummary.totalMigrationFiles),
            perPrefix: parseVpsSelfUpdateDatabaseMigrationPrefixSummaries(parsedSummary.perPrefix),
            isSkippedDueToActiveMigrationLock:
                typeof parsedSummary.isSkippedDueToActiveMigrationLock === 'boolean'
                    ? parsedSummary.isSkippedDueToActiveMigrationLock
                    : null,
        };
    } catch {
        return createEmptyVpsSelfUpdateDatabaseMigrationSummary();
    }
}

/**
 * Creates empty migration summary values for jobs without recorded migration details.
 *
 * @returns Empty database migration summary.
 */
function createEmptyVpsSelfUpdateDatabaseMigrationSummary(): Pick<
    VpsSelfUpdateDatabaseMigrationSnapshot,
    'processedPrefixes' | 'totalMigrationFiles' | 'perPrefix' | 'isSkippedDueToActiveMigrationLock'
> {
    return {
        processedPrefixes: [],
        totalMigrationFiles: null,
        perPrefix: [],
        isSkippedDueToActiveMigrationLock: null,
    };
}

/**
 * Resolves the migration status used when older status files do not contain migration fields.
 *
 * @param jobStatus - Persisted self-update job status.
 * @returns Migration status fallback.
 */
function resolveMissingVpsSelfUpdateDatabaseMigrationStatus(
    jobStatus: VpsSelfUpdateJobStatus,
): VpsSelfUpdateDatabaseMigrationStatus {
    return jobStatus === 'idle' ? 'pending' : 'unknown';
}

/**
 * Type guard for persisted database migration statuses.
 *
 * @param value - Raw status value.
 * @returns `true` when supported.
 */
function isVpsSelfUpdateDatabaseMigrationStatus(
    value: string | undefined,
): value is VpsSelfUpdateDatabaseMigrationStatus {
    return value !== undefined && VPS_SELF_UPDATE_DATABASE_MIGRATION_STATUSES.has(value as VpsSelfUpdateDatabaseMigrationStatus);
}

/**
 * Parses per-prefix migration summaries from untrusted JSON.
 *
 * @param value - Raw per-prefix JSON value.
 * @returns Normalized per-prefix summaries.
 */
function parseVpsSelfUpdateDatabaseMigrationPrefixSummaries(
    value: unknown,
): VpsSelfUpdateDatabaseMigrationSnapshot['perPrefix'] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isRecord).map((prefixSummary) => ({
        prefix: typeof prefixSummary.prefix === 'string' ? prefixSummary.prefix : '',
        appliedCount: parseNullableNonNegativeInteger(prefixSummary.appliedCount) ?? 0,
        appliedMigrationFiles: parseStringArray(prefixSummary.appliedMigrationFiles),
    }));
}

/**
 * Parses an array of strings from untrusted JSON.
 *
 * @param value - Raw JSON value.
 * @returns String array.
 */
function parseStringArray(value: unknown): Array<string> {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Parses a non-negative integer from untrusted JSON.
 *
 * @param value - Raw JSON value.
 * @returns Parsed integer or `null`.
 */
function parseNullableNonNegativeInteger(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Checks whether a raw JSON value is a record.
 *
 * @param value - Raw JSON value.
 * @returns `true` when the value is a non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
