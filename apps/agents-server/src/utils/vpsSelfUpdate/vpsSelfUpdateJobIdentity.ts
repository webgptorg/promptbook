import type { VpsSelfUpdateJobSnapshot } from './vpsSelfUpdateTypes';

/**
 * Resolves a stable identity for one self-update run.
 *
 * Newer jobs carry `jobId`; older persisted statuses fall back to their timestamps and target metadata
 * so they can still be archived without duplicating the latest singleton status row.
 *
 * @param job - Self-update job snapshot.
 * @returns Stable self-update job identity.
 *
 * @private function of `vpsSelfUpdate`
 */
export function resolveVpsSelfUpdateJobIdentity(job: VpsSelfUpdateJobSnapshot): string {
    if (job.jobId) {
        return job.jobId;
    }

    return [
        job.trigger,
        job.targetBranch || job.targetEnvironment.branch || 'unknown-target',
        job.startedAt || 'unknown-start',
        job.finishedAt || 'unfinished',
        job.targetCommitSha || 'unknown-target-commit',
    ].join(':');
}
