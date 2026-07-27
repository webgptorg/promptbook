import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { readVpsServerSetupTaskHistory } from './vpsTaskHistory';
import { runWithVpsServerSetupTask } from './runWithVpsServerSetupTask';

/**
 * Original Agents Server environment-file override.
 */
const ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE = process.env.PTBK_AGENTS_SERVER_ENV_FILE;

describe('runWithVpsServerSetupTask', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-vps-task-run-'));
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

    it('persists a running row before the operation and a finished row afterwards', async () => {
        let taskSeenDuringOperation: Awaited<ReturnType<typeof readVpsServerSetupTaskHistory>>[number] | undefined;

        const operationResult = await runWithVpsServerSetupTask(
            {
                taskName: 'Server setup: Test server',
                chatId: 'test.example.com',
                serverName: 'Test server',
                serverDomain: 'test.example.com',
            },
            async () => {
                taskSeenDuringOperation = (await readVpsServerSetupTaskHistory())[0];
                return 'finished';
            },
        );

        const [finishedTask] = await readVpsServerSetupTaskHistory();

        expect(operationResult).toBe('finished');
        expect(taskSeenDuringOperation).toMatchObject({
            kind: 'VPS_SERVER_SETUP',
            status: 'RUNNING',
            startedAt: expect.any(String),
            finishedAt: null,
        });
        expect(finishedTask).toMatchObject({
            kind: 'VPS_SERVER_SETUP',
            status: 'COMPLETED',
            startedAt: expect.any(String),
            finishedAt: expect.any(String),
            updatedAt: expect.any(String),
        });
    });
});
