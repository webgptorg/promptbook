import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getDefaultVpsSelfUpdateEnvironment } from './vpsSelfUpdateEnvironment';
import {
    preserveVpsSelfUpdateJobInTaskHistory,
    readVpsSelfUpdateJobTaskHistory,
    readVpsSelfUpdateJobTaskSnapshots,
} from './vpsSelfUpdateJobHistory';
import { VPS_SELF_UPDATE_RESTART_SUCCESS_STEP } from './vpsSelfUpdateJobConstants';
import { encodeStatusField, writeVpsSelfUpdateStatusFile } from './vpsSelfUpdateStateFiles';
import type { VpsSelfUpdateJobSnapshot } from './vpsSelfUpdateTypes';

/**
 * Original Agents Server env file override.
 */
const ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE = process.env.PTBK_AGENTS_SERVER_ENV_FILE;

describe('vpsSelfUpdateJobHistory', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-self-update-history-'));
        process.env.PTBK_AGENTS_SERVER_ENV_FILE = join(temporaryDirectory, '.env');
    });

    afterEach(async () => {
        if (ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE === undefined) {
            delete process.env.PTBK_AGENTS_SERVER_ENV_FILE;
        } else {
            process.env.PTBK_AGENTS_SERVER_ENV_FILE = ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE;
        }

        await rm(temporaryDirectory, { recursive: true, force: true });
    });

    it('preserves completed self-update jobs as compact task-history entries', async () => {
        await preserveVpsSelfUpdateJobInTaskHistory(
            createVpsSelfUpdateJobSnapshot({
                jobId: 'manual-update-1',
                currentStep: 'First update finished.',
                logTail: 'Verbose installer log.',
            }),
        );
        await preserveVpsSelfUpdateJobInTaskHistory(
            createVpsSelfUpdateJobSnapshot({
                jobId: 'manual-update-2',
                currentStep: 'Second update finished.',
            }),
        );

        const history = await readVpsSelfUpdateJobTaskHistory();

        expect(history.map((job) => job.jobId)).toEqual(['manual-update-2', 'manual-update-1']);
        expect(history[0]?.currentStep).toBe('Second update finished.');
        expect(history[1]?.logTail).toBeNull();
    });

    it('keeps the latest status snapshot ahead of archived duplicates', async () => {
        await preserveVpsSelfUpdateJobInTaskHistory(
            createVpsSelfUpdateJobSnapshot({
                jobId: 'manual-update-1',
                currentStep: 'Archived update state.',
            }),
        );
        await writeVpsSelfUpdateStatusFile({
            JOB_ID: 'manual-update-1',
            STATUS: 'succeeded',
            TRIGGER: 'manual',
            PID: '',
            TARGET_REF: 'production',
            CURRENT_STEP_B64: encodeStatusField('Latest update state.'),
            ERROR_MESSAGE_B64: '',
            STARTED_AT: '2026-07-09T10:00:00.000Z',
            FINISHED_AT: '2026-07-09T10:05:00.000Z',
            CURRENT_COMMIT: 'current-commit',
            TARGET_COMMIT: 'target-commit',
            LOG_FILE: '',
            DATABASE_MIGRATION_STATUS: 'succeeded',
            DATABASE_MIGRATION_SUMMARY_FILE: '',
            DATABASE_MIGRATION_SUMMARY_B64: '',
            DATABASE_MIGRATION_ERROR_MESSAGE_B64: '',
        });

        const snapshots = await readVpsSelfUpdateJobTaskSnapshots();

        expect(snapshots.map((job) => job.jobId)).toEqual(['manual-update-1']);
        expect(snapshots[0]?.currentStep).toBe('Latest update state.');
    });

    it('shows a stale restarted self-update status snapshot as succeeded when the target commit is deployed', async () => {
        const productionEnvironment = getDefaultVpsSelfUpdateEnvironment();
        await writeVpsSelfUpdateStatusFile({
            JOB_ID: 'manual-update-1',
            STATUS: 'running',
            TRIGGER: 'manual',
            PID: '99999999',
            TARGET_REF: productionEnvironment.branch,
            CURRENT_STEP_B64: encodeStatusField(
                'Removing previous Agents Server pm2 processes and garbage-collecting old versions.',
            ),
            ERROR_MESSAGE_B64: '',
            STARTED_AT: '2026-07-12T08:06:34.000Z',
            FINISHED_AT: '',
            CURRENT_COMMIT: 'old-commit',
            TARGET_COMMIT: 'target-commit',
            LOG_FILE: '',
            DATABASE_MIGRATION_STATUS: 'succeeded',
            DATABASE_MIGRATION_SUMMARY_FILE: '',
            DATABASE_MIGRATION_SUMMARY_B64: '',
            DATABASE_MIGRATION_ERROR_MESSAGE_B64: '',
        });

        const snapshots = await readVpsSelfUpdateJobTaskSnapshots({
            overviewContext: {
                currentEnvironment: productionEnvironment,
                currentCommitSha: 'target-commit',
            },
        });

        expect(snapshots).toHaveLength(1);
        expect(snapshots[0]).toMatchObject({
            jobId: 'manual-update-1',
            status: 'succeeded',
            currentStep: VPS_SELF_UPDATE_RESTART_SUCCESS_STEP,
            currentCommitSha: 'target-commit',
            errorMessage: null,
            isStale: false,
        });
    });

    it('archives stale restarted self-update jobs as succeeded when the target commit is already deployed', async () => {
        const productionEnvironment = getDefaultVpsSelfUpdateEnvironment();
        await preserveVpsSelfUpdateJobInTaskHistory(
            createVpsSelfUpdateJobSnapshot({
                jobId: 'manual-update-1',
                status: 'failed',
                pid: 99999999,
                currentStep: 'Removing previous Agents Server pm2 processes and garbage-collecting old versions.',
                currentCommitSha: 'old-commit',
                targetCommitSha: 'target-commit',
                finishedAt: null,
                isStale: true,
            }),
            {
                overviewContext: {
                    currentEnvironment: productionEnvironment,
                    currentCommitSha: 'target-commit',
                },
            },
        );

        const history = await readVpsSelfUpdateJobTaskHistory();

        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
            jobId: 'manual-update-1',
            status: 'succeeded',
            currentStep: VPS_SELF_UPDATE_RESTART_SUCCESS_STEP,
            currentCommitSha: 'target-commit',
            errorMessage: null,
            isStale: false,
        });
    });
});

/**
 * Creates one self-update job snapshot for history tests.
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
