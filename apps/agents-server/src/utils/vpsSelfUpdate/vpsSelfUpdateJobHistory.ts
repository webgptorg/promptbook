import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { resolveVpsSelfUpdateEnvironment } from './vpsSelfUpdateEnvironment';
import { resolveVpsSelfUpdateJobIdentity } from './vpsSelfUpdateJobIdentity';
import { readPersistedVpsSelfUpdateJob } from './readPersistedVpsSelfUpdateJob';
import { resolveVpsSelfUpdateTaskHistoryFilePath } from './vpsSelfUpdateStateFiles';
import type {
    VpsSelfUpdateDatabaseMigrationSnapshot,
    VpsSelfUpdateDatabaseMigrationStatus,
    VpsSelfUpdateJobSnapshot,
    VpsSelfUpdateJobStatus,
    VpsSelfUpdateJobTrigger,
} from './vpsSelfUpdateTypes';

/**
 * Version of the persisted self-update task history file.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_TASK_HISTORY_VERSION = 1;

/**
 * Statuses accepted from the persisted task history file.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_JOB_STATUSES = new Set<VpsSelfUpdateJobStatus>([
    'idle',
    'running',
    'succeeded',
    'failed',
]);

/**
 * Database migration statuses accepted from the persisted task history file.
 *
 * @private constant of `vpsSelfUpdate`
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
 * Persisted self-update task history file shape.
 *
 * @private type of `vpsSelfUpdate`
 */
type VpsSelfUpdateTaskHistoryFile = {
    readonly version: typeof VPS_SELF_UPDATE_TASK_HISTORY_VERSION;
    readonly jobs: ReadonlyArray<VpsSelfUpdateJobSnapshot>;
};

/**
 * Archives one latest self-update snapshot before a new self-update overwrites the singleton status file.
 *
 * @param job - Latest job snapshot to preserve in task history.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function preserveVpsSelfUpdateJobInTaskHistory(job: VpsSelfUpdateJobSnapshot): Promise<void> {
    if (job.status === 'idle') {
        return;
    }

    const history = await readVpsSelfUpdateJobTaskHistory();
    const jobs = collectUniqueVpsSelfUpdateJobs([sanitizeVpsSelfUpdateJobForTaskHistory(job), ...history]);
    await writeVpsSelfUpdateJobTaskHistory(jobs);
}

/**
 * Reads all self-update task snapshots that should be surfaced in the admin task manager.
 *
 * @returns Latest singleton status followed by archived history, with duplicates removed.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateJobTaskSnapshots(): Promise<Array<VpsSelfUpdateJobSnapshot>> {
    const latestJob = await readPersistedVpsSelfUpdateJob({ isLogTailIncluded: false });
    const history = await readVpsSelfUpdateJobTaskHistory();
    return collectUniqueVpsSelfUpdateJobs([latestJob, ...history]).filter((job) => job.status !== 'idle');
}

/**
 * Reads archived self-update task snapshots from disk.
 *
 * @returns Archived task snapshots.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateJobTaskHistory(): Promise<Array<VpsSelfUpdateJobSnapshot>> {
    const historyFilePath = resolveVpsSelfUpdateTaskHistoryFilePath();

    try {
        const rawHistory = await readFile(historyFilePath, 'utf-8');
        const parsedHistory = JSON.parse(rawHistory) as unknown;
        if (!isVpsSelfUpdateTaskHistoryFile(parsedHistory)) {
            return [];
        }

        return parsedHistory.jobs
            .map(normalizeVpsSelfUpdateJobFromTaskHistory)
            .filter((job): job is VpsSelfUpdateJobSnapshot => job !== null);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
            return [];
        }

        throw error;
    }
}

/**
 * Writes archived self-update task snapshots to disk.
 *
 * @param jobs - Archived task snapshots.
 *
 * @private function of `vpsSelfUpdate`
 */
async function writeVpsSelfUpdateJobTaskHistory(jobs: ReadonlyArray<VpsSelfUpdateJobSnapshot>): Promise<void> {
    const historyFilePath = resolveVpsSelfUpdateTaskHistoryFilePath();
    const history: VpsSelfUpdateTaskHistoryFile = {
        version: VPS_SELF_UPDATE_TASK_HISTORY_VERSION,
        jobs,
    };

    await mkdir(dirname(historyFilePath), { recursive: true });
    await writeFile(historyFilePath, `${JSON.stringify(history, null, 2)}\n`, 'utf-8');
}

/**
 * Removes duplicate self-update jobs while preserving the first snapshot for each identity.
 *
 * @param jobs - Candidate self-update job snapshots.
 * @returns Unique self-update job snapshots.
 *
 * @private function of `vpsSelfUpdate`
 */
function collectUniqueVpsSelfUpdateJobs(
    jobs: ReadonlyArray<VpsSelfUpdateJobSnapshot>,
): Array<VpsSelfUpdateJobSnapshot> {
    const jobsByIdentity = new Map<string, VpsSelfUpdateJobSnapshot>();

    for (const job of jobs) {
        const identity = resolveVpsSelfUpdateJobIdentity(job);
        if (!jobsByIdentity.has(identity)) {
            jobsByIdentity.set(identity, job);
        }
    }

    return [...jobsByIdentity.values()];
}

/**
 * Removes log text before persisting a task-history snapshot.
 *
 * @param job - Self-update job snapshot.
 * @returns Compact task-history snapshot.
 *
 * @private function of `vpsSelfUpdate`
 */
function sanitizeVpsSelfUpdateJobForTaskHistory(job: VpsSelfUpdateJobSnapshot): VpsSelfUpdateJobSnapshot {
    return {
        ...job,
        logTail: null,
    };
}

/**
 * Checks whether a parsed JSON value is a task-history file.
 *
 * @param value - Parsed JSON value.
 * @returns `true` when the value has the expected task-history shape.
 *
 * @private function of `vpsSelfUpdate`
 */
function isVpsSelfUpdateTaskHistoryFile(value: unknown): value is { readonly jobs: ReadonlyArray<unknown> } {
    return (
        isRecord(value) &&
        value.version === VPS_SELF_UPDATE_TASK_HISTORY_VERSION &&
        Array.isArray(value.jobs)
    );
}

/**
 * Normalizes one untrusted task-history job snapshot.
 *
 * @param value - Raw job snapshot from JSON.
 * @returns Normalized job snapshot or `null` when invalid.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeVpsSelfUpdateJobFromTaskHistory(value: unknown): VpsSelfUpdateJobSnapshot | null {
    if (!isRecord(value)) {
        return null;
    }

    const status = normalizeVpsSelfUpdateJobStatus(value.status);
    if (!status || status === 'idle') {
        return null;
    }

    const trigger = normalizeVpsSelfUpdateJobTrigger(value.trigger);
    const targetBranch = normalizeNullableString(value.targetBranch);
    const targetEnvironment = resolveVpsSelfUpdateEnvironment(targetBranch);
    const databaseMigrations = normalizeVpsSelfUpdateDatabaseMigrationSnapshot(value.databaseMigrations);

    return {
        jobId: normalizeNullableString(value.jobId),
        status,
        trigger,
        pid: normalizeNullableNumber(value.pid),
        targetBranch,
        targetEnvironment,
        currentStep: normalizeNullableString(value.currentStep),
        currentCommitSha: normalizeNullableString(value.currentCommitSha),
        targetCommitSha: normalizeNullableString(value.targetCommitSha),
        errorMessage: normalizeNullableString(value.errorMessage),
        startedAt: normalizeNullableString(value.startedAt),
        finishedAt: normalizeNullableString(value.finishedAt),
        isStale: value.isStale === true,
        logTail: null,
        logFilePath: normalizeNullableString(value.logFilePath),
        databaseMigrations,
    };
}

/**
 * Normalizes the database migration snapshot nested in a task-history job.
 *
 * @param value - Raw database migration snapshot from JSON.
 * @returns Normalized database migration snapshot.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeVpsSelfUpdateDatabaseMigrationSnapshot(value: unknown): VpsSelfUpdateDatabaseMigrationSnapshot {
    if (!isRecord(value)) {
        return createEmptyVpsSelfUpdateDatabaseMigrationSnapshot();
    }

    return {
        status: normalizeVpsSelfUpdateDatabaseMigrationStatus(value.status) || 'unknown',
        processedPrefixes: normalizeStringArray(value.processedPrefixes),
        totalMigrationFiles: normalizeNullableNumber(value.totalMigrationFiles),
        perPrefix: normalizeVpsSelfUpdateDatabaseMigrationPrefixSummaries(value.perPrefix),
        isSkippedDueToActiveMigrationLock:
            typeof value.isSkippedDueToActiveMigrationLock === 'boolean'
                ? value.isSkippedDueToActiveMigrationLock
                : null,
        errorMessage: normalizeNullableString(value.errorMessage),
        summaryFilePath: normalizeNullableString(value.summaryFilePath),
    };
}

/**
 * Creates an empty database migration snapshot for old or invalid task-history entries.
 *
 * @returns Empty database migration snapshot.
 *
 * @private function of `vpsSelfUpdate`
 */
function createEmptyVpsSelfUpdateDatabaseMigrationSnapshot(): VpsSelfUpdateDatabaseMigrationSnapshot {
    return {
        status: 'unknown',
        processedPrefixes: [],
        totalMigrationFiles: null,
        perPrefix: [],
        isSkippedDueToActiveMigrationLock: null,
        errorMessage: null,
        summaryFilePath: null,
    };
}

/**
 * Normalizes per-prefix migration summaries from untrusted task-history JSON.
 *
 * @param value - Raw per-prefix JSON value.
 * @returns Normalized per-prefix summaries.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeVpsSelfUpdateDatabaseMigrationPrefixSummaries(
    value: unknown,
): VpsSelfUpdateDatabaseMigrationSnapshot['perPrefix'] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isRecord).map((summary) => ({
        prefix: typeof summary.prefix === 'string' ? summary.prefix : '',
        appliedCount: normalizeNullableNumber(summary.appliedCount) ?? 0,
        appliedMigrationFiles: normalizeStringArray(summary.appliedMigrationFiles),
    }));
}

/**
 * Normalizes one self-update job status from task-history JSON.
 *
 * @param value - Raw status value.
 * @returns Supported status or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeVpsSelfUpdateJobStatus(value: unknown): VpsSelfUpdateJobStatus | null {
    return typeof value === 'string' && VPS_SELF_UPDATE_JOB_STATUSES.has(value as VpsSelfUpdateJobStatus)
        ? (value as VpsSelfUpdateJobStatus)
        : null;
}

/**
 * Normalizes one self-update trigger from task-history JSON.
 *
 * @param value - Raw trigger value.
 * @returns Supported trigger.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeVpsSelfUpdateJobTrigger(value: unknown): VpsSelfUpdateJobTrigger {
    return value === 'automatic' ? 'automatic' : 'manual';
}

/**
 * Normalizes one database migration status from task-history JSON.
 *
 * @param value - Raw status value.
 * @returns Supported migration status or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeVpsSelfUpdateDatabaseMigrationStatus(value: unknown): VpsSelfUpdateDatabaseMigrationStatus | null {
    return typeof value === 'string' &&
        VPS_SELF_UPDATE_DATABASE_MIGRATION_STATUSES.has(value as VpsSelfUpdateDatabaseMigrationStatus)
        ? (value as VpsSelfUpdateDatabaseMigrationStatus)
        : null;
}

/**
 * Normalizes one nullable string field from task-history JSON.
 *
 * @param value - Raw field value.
 * @returns String value or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeNullableString(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Normalizes one nullable non-negative number field from task-history JSON.
 *
 * @param value - Raw field value.
 * @returns Number value or `null`.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeNullableNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Normalizes an array of strings from task-history JSON.
 *
 * @param value - Raw field value.
 * @returns String array.
 *
 * @private function of `vpsSelfUpdate`
 */
function normalizeStringArray(value: unknown): Array<string> {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Checks whether a raw JSON value is a record.
 *
 * @param value - Raw JSON value.
 * @returns `true` when the value is a non-array object.
 *
 * @private function of `vpsSelfUpdate`
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
