import { resolveVpsSelfUpdateEnvironment } from './vpsSelfUpdateEnvironment';
import { VPS_SELF_UPDATE_STALE_ERROR_MESSAGE } from './vpsSelfUpdateJobConstants';
import {
    decodeVpsSelfUpdateStatusField,
    readLastVpsSelfUpdateTextFileChunk,
    readVpsSelfUpdateStatusFile,
    resolveVpsSelfUpdateLogFilePath,
} from './vpsSelfUpdateStateFiles';
import type { VpsSelfUpdateJobSnapshot, VpsSelfUpdateJobStatus } from './vpsSelfUpdateTypes';
import type { VpsSelfUpdateJobTrigger } from './vpsSelfUpdateTypes';

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
    const pid = parseNullableVpsSelfUpdateInteger(statusEntries.get('PID'));
    const currentStep = decodeVpsSelfUpdateStatusField(statusEntries.get('CURRENT_STEP_B64'));
    const errorMessage = decodeVpsSelfUpdateStatusField(statusEntries.get('ERROR_MESSAGE_B64'));
    const logFilePath = statusEntries.get('LOG_FILE') || resolveVpsSelfUpdateLogFilePath();
    const rawStatus = statusEntries.get('STATUS');
    const status = isVpsSelfUpdateJobStatus(rawStatus) ? rawStatus : 'idle';
    const rawTrigger = statusEntries.get('TRIGGER');
    const trigger = isVpsSelfUpdateJobTrigger(rawTrigger) ? rawTrigger : 'manual';
    const isStale = status === 'running' && pid !== null ? !(await isVpsSelfUpdateProcessAlive(pid)) : false;

    return {
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
        finishedAt: statusEntries.get('FINISHED_AT') || null,
        isStale,
        logTail: await readLastVpsSelfUpdateTextFileChunk(logFilePath),
        logFilePath,
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
