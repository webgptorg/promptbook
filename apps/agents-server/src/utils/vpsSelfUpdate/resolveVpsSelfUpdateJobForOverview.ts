import { VPS_SELF_UPDATE_RESTART_SUCCESS_STEP, VPS_SELF_UPDATE_STALE_ERROR_MESSAGE } from './vpsSelfUpdateJobConstants';
import type { VpsSelfUpdateJobOverviewContext, VpsSelfUpdateJobSnapshot } from './vpsSelfUpdateTypes';

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
 *
 * @private function of `vpsSelfUpdate`
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
