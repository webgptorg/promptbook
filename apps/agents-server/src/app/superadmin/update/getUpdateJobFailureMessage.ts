import type { UpdateJobSnapshot } from './UpdateOverview';

/**
 * Builds the failure message for a failed standalone VPS update.
 *
 * @param job - Failed update job snapshot.
 * @returns Human-readable failure message.
 *
 * @private function of `<UpdateClient/>`
 */
export function getUpdateJobFailureMessage(job: UpdateJobSnapshot): string {
    return job.errorMessage || 'The standalone VPS update failed. Review the installer log for details.';
}
