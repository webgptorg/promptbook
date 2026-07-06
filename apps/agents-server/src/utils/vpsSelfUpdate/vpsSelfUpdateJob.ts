import { isProcessAlive } from './isProcessAlive';
import { readLastTextFileChunk } from './readLastTextFileChunk';
import { resolveVpsSelfUpdateEnvironment } from './vpsSelfUpdateEnvironments';
import { resolveVpsSelfUpdateLogFilePath } from './vpsSelfUpdateStatePaths';
import { decodeStatusField, readVpsSelfUpdateStatusFile } from './vpsSelfUpdateStatusFile';
import type {
    VpsSelfUpdateJobOverviewContext,
    VpsSelfUpdateJobSnapshot,
    VpsSelfUpdateJobStatus,
} from './vpsSelfUpdateTypes';

/**
 * Fallback error used when a running self-update process disappears without writing a terminal status.
 */
const VPS_SELF_UPDATE_STALE_ERROR_MESSAGE =
    'The previous background update process stopped unexpectedly before writing its final status.';

/**
 * Success step shown when the server proves a stale-looking job completed across a process restart.
 */
const VPS_SELF_UPDATE_RESTART_SUCCESS_STEP =
    'Standalone VPS self-update finished successfully after restarting the server.';

/**
 * Reads a lightweight snapshot of the currently persisted standalone VPS self-update job.
 *
 * Reads only the persisted status file and its log tail — no git access, no remote fetching —
 * so it is safe to call from frequent polling loops such as the admin task manager.
 *
 * @returns Parsed job snapshot (status `idle` when no job has ever been persisted).
 */
export async function readVpsSelfUpdateJobSnapshot(): Promise<VpsSelfUpdateJobSnapshot> {
    return readPersistedVpsSelfUpdateJob();
}

/**
 * Reads one persisted update-job snapshot from disk.
 *
 * @returns Parsed job snapshot.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readPersistedVpsSelfUpdateJob(): Promise<VpsSelfUpdateJobSnapshot> {
    const statusEntries = await readVpsSelfUpdateStatusFile();
    const targetBranch = statusEntries.get('TARGET_REF') || null;
    const targetEnvironment = resolveVpsSelfUpdateEnvironment(targetBranch);
    const pid = parseNullableInteger(statusEntries.get('PID'));
    const currentStep = decodeStatusField(statusEntries.get('CURRENT_STEP_B64'));
    const errorMessage = decodeStatusField(statusEntries.get('ERROR_MESSAGE_B64'));
    const logFilePath = statusEntries.get('LOG_FILE') || resolveVpsSelfUpdateLogFilePath();
    const rawStatus = statusEntries.get('STATUS');
    const status = isVpsSelfUpdateJobStatus(rawStatus) ? rawStatus : 'idle';
    const isStale = status === 'running' && pid !== null ? !(await isProcessAlive(pid)) : false;

    return {
        status: isStale ? 'failed' : status,
        pid,
        targetBranch,
        targetEnvironment,
        currentStep,
        currentCommitSha: statusEntries.get('CURRENT_COMMIT') || null,
        targetCommitSha: statusEntries.get('TARGET_COMMIT') || null,
        errorMessage: isStale && !errorMessage ? VPS_SELF_UPDATE_STALE_ERROR_MESSAGE : errorMessage,
        startedAt: statusEntries.get('STARTED_AT') || null,
        finishedAt: statusEntries.get('FINISHED_AT') || null,
        isStale,
        logTail: await readLastTextFileChunk(logFilePath),
        logFilePath,
    };
}

/**
 * Converts the persisted shell status into the status that should be shown in the admin overview.
 *
 * A successful self-update may restart the old Agents Server process before the browser sees the final
 * `STATUS=succeeded` write. In that case the stale PID alone is not enough to call the update failed:
 * if the running server is already on the recorded target branch and target commit, the update succeeded.
 *
 * @param job - Persisted self-update job snapshot.
 * @param context - Current repository state observed by the running server.
 * @returns Job snapshot resolved for browser display.
 */
export function resolveVpsSelfUpdateJobForOverview(
    job: VpsSelfUpdateJobSnapshot,
    context: VpsSelfUpdateJobOverviewContext,
): VpsSelfUpdateJobSnapshot {
    const isRestartedSuccessfulUpdate =
        job.status === 'failed' &&
        job.isStale &&
        (!job.errorMessage || job.errorMessage === VPS_SELF_UPDATE_STALE_ERROR_MESSAGE) &&
        job.targetBranch === context.currentEnvironment.branch &&
        job.targetCommitSha !== null &&
        context.currentCommitSha !== null &&
        job.targetCommitSha === context.currentCommitSha;

    if (!isRestartedSuccessfulUpdate) {
        return job;
    }

    return {
        ...job,
        status: 'succeeded',
        currentStep: VPS_SELF_UPDATE_RESTART_SUCCESS_STEP,
        currentCommitSha: context.currentCommitSha,
        errorMessage: null,
        isStale: false,
    };
}

/**
 * Parses one optional integer field.
 *
 * @param value - Raw string value.
 * @returns Parsed integer or `null`.
 */
function parseNullableInteger(value: string | undefined): number | null {
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
