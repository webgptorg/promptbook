import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { readVpsSelfUpdateJobSnapshot } from './readPersistedVpsSelfUpdateJob';
import { writeVpsSelfUpdateStatusFile } from './vpsSelfUpdateStateFiles';

/**
 * Original Agents Server env file override.
 */
const ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE = process.env.PTBK_AGENTS_SERVER_ENV_FILE;

/**
 * Start timestamp shared by the status-file fixtures.
 */
const FIXTURE_STARTED_AT = '2026-07-12T08:06:34.000Z';

describe('readVpsSelfUpdateJobSnapshot', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-self-update-status-'));
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

    it('derives the finish time from the status file when a stale update never wrote its own finish timestamp', async () => {
        await writeVpsSelfUpdateStatusFile(createStatusFileEntries({ STATUS: 'running', PID: '99999999', FINISHED_AT: '' }));

        const snapshot = await readVpsSelfUpdateJobSnapshot();

        expect(snapshot.status).toBe('failed');
        expect(snapshot.isStale).toBe(true);
        expect(snapshot.finishedAt).not.toBeNull();
        expect(Date.parse(snapshot.finishedAt as string)).toBeGreaterThanOrEqual(Date.parse(FIXTURE_STARTED_AT));
    });

    it('keeps the recorded finish timestamp when the installer wrote its own terminal status', async () => {
        await writeVpsSelfUpdateStatusFile(
            createStatusFileEntries({ STATUS: 'succeeded', PID: '', FINISHED_AT: '2026-07-12T08:10:00.000Z' }),
        );

        const snapshot = await readVpsSelfUpdateJobSnapshot();

        expect(snapshot.status).toBe('succeeded');
        expect(snapshot.finishedAt).toBe('2026-07-12T08:10:00.000Z');
    });

    it('leaves the finish time empty while the update process is still alive', async () => {
        await writeVpsSelfUpdateStatusFile(
            createStatusFileEntries({ STATUS: 'running', PID: String(process.pid), FINISHED_AT: '' }),
        );

        const snapshot = await readVpsSelfUpdateJobSnapshot();

        expect(snapshot.status).toBe('running');
        expect(snapshot.isStale).toBe(false);
        expect(snapshot.finishedAt).toBeNull();
    });
});

/**
 * Builds one shell-owned status file field set for status snapshot tests.
 *
 * @param overrides - Status, process, and finish fields describing the persisted job.
 * @returns Flat status-file fields.
 */
function createStatusFileEntries(overrides: {
    readonly STATUS: string;
    readonly PID: string;
    readonly FINISHED_AT: string;
}): Record<string, string> {
    return {
        JOB_ID: 'manual-update-1',
        STATUS: overrides.STATUS,
        TRIGGER: 'manual',
        PID: overrides.PID,
        TARGET_REF: 'main',
        CURRENT_STEP_B64: '',
        ERROR_MESSAGE_B64: '',
        STARTED_AT: FIXTURE_STARTED_AT,
        FINISHED_AT: overrides.FINISHED_AT,
        CURRENT_COMMIT: 'current-commit',
        TARGET_COMMIT: 'target-commit',
        LOG_FILE: '',
        DATABASE_MIGRATION_STATUS: 'succeeded',
        DATABASE_MIGRATION_SUMMARY_FILE: '',
        DATABASE_MIGRATION_SUMMARY_B64: '',
        DATABASE_MIGRATION_ERROR_MESSAGE_B64: '',
    };
}
