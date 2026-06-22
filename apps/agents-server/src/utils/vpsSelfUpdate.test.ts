import { describe, expect, it } from '@jest/globals';
import {
    resolveVpsSelfUpdateJobForOverview,
    VPS_SELF_UPDATE_ENVIRONMENTS,
    type VpsSelfUpdateJobSnapshot,
} from './vpsSelfUpdate';

/**
 * Canonical production environment option used by self-update resolver tests.
 */
const PRODUCTION_ENVIRONMENT = VPS_SELF_UPDATE_ENVIRONMENTS[0];

describe('resolveVpsSelfUpdateJobForOverview', () => {
    it('treats a stale update job as succeeded when the target commit is already deployed', () => {
        const resolvedJob = resolveVpsSelfUpdateJobForOverview(createStaleUpdateJob(), {
            currentEnvironment: PRODUCTION_ENVIRONMENT,
            currentCommitSha: 'target-commit',
        });

        expect(resolvedJob).toMatchObject({
            status: 'succeeded',
            currentCommitSha: 'target-commit',
            errorMessage: null,
            isStale: false,
        });
        expect(resolvedJob.currentStep).toBe(
            'Standalone VPS self-update finished successfully after restarting the server.',
        );
    });

    it('keeps a stale update job failed when the deployed commit does not match the target commit', () => {
        const job = createStaleUpdateJob();

        const resolvedJob = resolveVpsSelfUpdateJobForOverview(job, {
            currentEnvironment: PRODUCTION_ENVIRONMENT,
            currentCommitSha: 'different-commit',
        });

        expect(resolvedJob).toBe(job);
        expect(resolvedJob.status).toBe('failed');
        expect(resolvedJob.isStale).toBe(true);
    });

    it('keeps explicit update failures failed even when the target commit is deployed', () => {
        const job = createStaleUpdateJob({
            errorMessage: 'The standalone VPS self-update exited with status 1.',
            isStale: false,
        });

        const resolvedJob = resolveVpsSelfUpdateJobForOverview(job, {
            currentEnvironment: PRODUCTION_ENVIRONMENT,
            currentCommitSha: 'target-commit',
        });

        expect(resolvedJob).toBe(job);
        expect(resolvedJob.status).toBe('failed');
        expect(resolvedJob.errorMessage).toBe('The standalone VPS self-update exited with status 1.');
    });
});

/**
 * Builds a persisted job snapshot shaped like a successful update interrupted by the old server restart.
 *
 * @param overrides - Fields to override for a specific test case.
 * @returns Stale self-update job snapshot.
 */
function createStaleUpdateJob(overrides: Partial<VpsSelfUpdateJobSnapshot> = {}): VpsSelfUpdateJobSnapshot {
    return {
        status: 'failed',
        pid: 1234,
        targetBranch: PRODUCTION_ENVIRONMENT.branch,
        targetEnvironment: PRODUCTION_ENVIRONMENT,
        currentStep: 'Removing the previous pm2 process and repository checkout.',
        currentCommitSha: 'old-commit',
        targetCommitSha: 'target-commit',
        errorMessage: null,
        startedAt: '2026-06-22T08:00:00.000Z',
        finishedAt: null,
        isStale: true,
        logTail: null,
        logFilePath: '/tmp/promptbook-self-update.log',
        ...overrides,
    };
}
