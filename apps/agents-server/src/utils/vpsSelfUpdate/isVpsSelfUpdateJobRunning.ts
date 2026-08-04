import type { VpsSelfUpdateJobSnapshot } from './vpsSelfUpdateTypes';

/**
 * Checks whether one persisted self-update job is really running right now.
 *
 * A job whose installer process disappeared without writing a terminal status still claims to be
 * running in the status file, so the stale flag has to be taken into account together with the status.
 *
 * @param job - Persisted self-update job snapshot.
 * @returns `true` when a standalone VPS self-update is in progress.
 *
 * @private function of `vpsSelfUpdate`
 */
export function isVpsSelfUpdateJobRunning(job: VpsSelfUpdateJobSnapshot): boolean {
    return job.status === 'running' && !job.isStale;
}
