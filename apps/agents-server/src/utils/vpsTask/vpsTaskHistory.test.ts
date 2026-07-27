import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AdminChatTaskRecord } from '../chatTasksAdmin';
import { appendVpsServerSetupTask, finishVpsServerSetupTask, readVpsServerSetupTaskHistory } from './vpsTaskHistory';

/**
 * Original Agents Server environment-file override.
 */
const ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE = process.env.PTBK_AGENTS_SERVER_ENV_FILE;

describe('vpsTaskHistory', () => {
    let temporaryDirectory: string;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-vps-task-history-'));
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

    it('persists the complete lifecycle including the finish timestamp', async () => {
        const task = createVpsServerSetupTaskRecordForTest();
        await appendVpsServerSetupTask(task);

        await finishVpsServerSetupTask(task.id, {
            status: 'COMPLETED',
            finishedAt: '2026-07-27T10:05:00.000Z',
            updatedAt: '2026-07-27T10:05:00.000Z',
            lastErrorSummary: null,
            lastErrorDetails: null,
        });

        await expect(readVpsServerSetupTaskHistory()).resolves.toEqual([
            expect.objectContaining({
                id: task.id,
                startedAt: '2026-07-27T10:00:00.000Z',
                finishedAt: '2026-07-27T10:05:00.000Z',
                status: 'COMPLETED',
            }),
        ]);
    });
});

/**
 * Creates a stable server setup task row for history tests.
 *
 * @returns Running server setup task row.
 *
 * @private test helper of `vpsTaskHistory`
 */
function createVpsServerSetupTaskRecordForTest(): AdminChatTaskRecord {
    return {
        id: 'vps-server-setup:test-task',
        kind: 'VPS_SERVER_SETUP',
        status: 'RUNNING',
        createdAt: '2026-07-27T10:00:00.000Z',
        queuedAt: '2026-07-27T10:00:00.000Z',
        startedAt: '2026-07-27T10:00:00.000Z',
        updatedAt: '2026-07-27T10:00:00.000Z',
        finishedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: '2026-07-27T10:00:00.000Z',
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 1,
        retryCount: 0,
        lastErrorSummary: null,
        lastErrorDetails: null,
        userId: 0,
        username: null,
        agentPermanentId: 'vps-server-setup:test-task',
        agentName: 'Server setup: Test server',
        chatId: 'test.example.com',
        workerId: '1234',
        queueName: 'vps-server-setup',
    };
}
