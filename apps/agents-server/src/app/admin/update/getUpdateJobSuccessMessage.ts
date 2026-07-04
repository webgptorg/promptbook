import type { UpdateJobSnapshot } from './UpdateOverview';

/**
 * Builds the success message for a finished standalone VPS update.
 *
 * @param job - Completed update job snapshot.
 * @returns Human-readable success message.
 *
 * @private function of `<UpdateClient/>`
 */
export function getUpdateJobSuccessMessage(job: UpdateJobSnapshot): string {
    return job.currentStep || 'Standalone VPS update finished successfully.';
}
