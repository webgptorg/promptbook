import { describe, expect, it } from '@jest/globals';
import { getDefaultVpsSelfUpdateEnvironment, type VpsSelfUpdateJobSnapshot } from '../vpsSelfUpdate';
import { mapVpsSelfUpdateJobToAdminChatTask } from './mapVpsSelfUpdateJobToAdminChatTask';

describe('mapVpsSelfUpdateJobToAdminChatTask', () => {
    it('uses the self-update job identity in the task id', () => {
        const firstTask = mapVpsSelfUpdateJobToAdminChatTask(
            createVpsSelfUpdateJobSnapshot({ jobId: 'manual-update-1' }),
        );
        const secondTask = mapVpsSelfUpdateJobToAdminChatTask(
            createVpsSelfUpdateJobSnapshot({ jobId: 'manual-update-2' }),
        );

        expect(firstTask?.id).toBe('vps-self-update:manual-update-1');
        expect(secondTask?.id).toBe('vps-self-update:manual-update-2');
    });
});

/**
 * Creates one self-update job snapshot for mapper tests.
 *
 * @param overrides - Field overrides.
 * @returns Self-update job snapshot.
 */
function createVpsSelfUpdateJobSnapshot(
    overrides: Partial<VpsSelfUpdateJobSnapshot> = {},
): VpsSelfUpdateJobSnapshot {
    const productionEnvironment = getDefaultVpsSelfUpdateEnvironment();

    return {
        jobId: 'manual-update',
        status: 'succeeded',
        trigger: 'manual',
        pid: null,
        targetBranch: productionEnvironment.branch,
        targetEnvironment: productionEnvironment,
        currentStep: 'Standalone VPS self-update finished successfully.',
        currentCommitSha: 'current-commit',
        targetCommitSha: 'target-commit',
        errorMessage: null,
        startedAt: '2026-07-09T10:00:00.000Z',
        finishedAt: '2026-07-09T10:05:00.000Z',
        isStale: false,
        logTail: null,
        logFilePath: '/tmp/self-update.log',
        databaseMigrations: {
            status: 'succeeded',
            processedPrefixes: [],
            totalMigrationFiles: null,
            perPrefix: [],
            isSkippedDueToActiveMigrationLock: null,
            errorMessage: null,
            summaryFilePath: null,
        },
        ...overrides,
    };
}
