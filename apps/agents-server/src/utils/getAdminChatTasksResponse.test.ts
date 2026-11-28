import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AdminChatTaskRecord } from './chatTasksAdmin';
import type { GetAdminChatTasksData } from './getAdminChatTasksResponse/getAdminChatTasks';
import { getDefaultVpsSelfUpdateEnvironment } from './vpsSelfUpdate/vpsSelfUpdateEnvironment';
import type { VpsSelfUpdateJobSnapshot } from './vpsSelfUpdate/vpsSelfUpdateTypes';

jest.mock('@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped', () => ({
    ensureUserChatTimeoutWorkerBootstrapped: jest.fn(),
}));

jest.mock('./getAdminChatTasksResponse/throttledAdminRecovery', () => ({
    throttledAdminRecovery: jest.fn(async () => undefined),
}));

jest.mock('./getAdminChatTasksResponse/getAdminChatTasks', () => ({
    getAdminChatTasks: jest.fn(),
}));

jest.mock('./pagePreviewBrowserSessions', () => ({
    listPagePreviewBrowserAdminTasks: jest.fn(() => []),
}));

jest.mock('./vpsSelfUpdate', () => ({
    readVpsSelfUpdateJobTaskSnapshots: jest.fn(),
}));

import { getAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks';
import { getAdminChatTasksResponse } from './getAdminChatTasksResponse';
import { readVpsSelfUpdateJobTaskSnapshots } from './vpsSelfUpdate';

/**
 * Fixed reference time used so relative task timestamps stay inside the default `All` window.
 *
 * @private test constant of `getAdminChatTasksResponse`
 */
const REFERENCE_TIMESTAMP = Date.parse('2026-07-07T12:00:00.000Z');

/**
 * Builds one ISO timestamp a whole number of hours before the fixed reference time.
 *
 * @private test helper of `getAdminChatTasksResponse`
 */
function hoursBeforeReferenceIso(hours: number): string {
    return new Date(REFERENCE_TIMESTAMP - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Builds one finished chat-completion row as the database-backed loader would return it.
 *
 * @private test helper of `getAdminChatTasksResponse`
 */
function createFinishedChatTaskRecord(id: string, finishedHoursAgo: number): AdminChatTaskRecord {
    const finishedAtIso = hoursBeforeReferenceIso(finishedHoursAgo);

    return {
        id,
        kind: 'CHAT_COMPLETION',
        status: 'COMPLETED',
        createdAt: finishedAtIso,
        queuedAt: finishedAtIso,
        startedAt: finishedAtIso,
        updatedAt: finishedAtIso,
        finishedAt: finishedAtIso,
        cancelRequestedAt: null,
        pausedAt: null,
        lastHeartbeatAt: null,
        leaseExpiresAt: null,
        recurrenceIntervalMs: null,
        priority: null,
        attemptCount: 1,
        retryCount: 0,
        lastErrorSummary: null,
        lastErrorDetails: null,
        userId: 6,
        username: 'admin',
        agentPermanentId: 'agent-1',
        agentName: 'Generic chatter',
        chatId: 'chat',
        workerId: null,
        queueName: 'user-chat-jobs',
    };
}

/**
 * Builds one succeeded self-update snapshot as the task-history reader would return it.
 *
 * @private test helper of `getAdminChatTasksResponse`
 */
function createSucceededSelfUpdateSnapshot(jobId: string, finishedHoursAgo: number): VpsSelfUpdateJobSnapshot {
    const finishedAtIso = hoursBeforeReferenceIso(finishedHoursAgo);

    return {
        jobId,
        status: 'succeeded',
        trigger: 'manual',
        pid: 72854,
        targetBranch: 'main',
        targetEnvironment: getDefaultVpsSelfUpdateEnvironment(),
        currentStep: 'Standalone VPS self-update finished successfully.',
        currentCommitSha: 'current-commit',
        targetCommitSha: 'target-commit',
        errorMessage: null,
        startedAt: finishedAtIso,
        finishedAt: finishedAtIso,
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
    };
}

describe('getAdminChatTasksResponse · All view interleaves injected self-updates with chat tasks by finished time', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(REFERENCE_TIMESTAMP));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('does not pin self-updates on top: a self-update finished 17h ago sinks below chats finished 7h and 10h ago', async () => {
        // Mirrors the reported screenshot through the real injection-merge pipeline: two injected self-updates
        // (finished 2h and 17h ago) merged with two database chat completions (finished 7h and 10h ago).
        jest.mocked(readVpsSelfUpdateJobTaskSnapshots).mockResolvedValue([
            createSucceededSelfUpdateSnapshot('recent', 2),
            createSucceededSelfUpdateSnapshot('old', 17),
        ]);
        jest.mocked(getAdminChatTasks).mockResolvedValue({
            items: [createFinishedChatTaskRecord('chat-7h', 7), createFinishedChatTaskRecord('chat-10h', 10)],
            total: 2,
            counters: {
                runningCount: 0,
                queuedCount: 0,
                failedLast24hCount: 0,
                oldestQueuedAgeMs: null,
            },
        } satisfies GetAdminChatTasksData);

        const result = await getAdminChatTasksResponse(new URLSearchParams({ view: 'all' }));

        expect(result.status).toBe(200);
        if (result.status !== 200) {
            throw new Error('Expected a successful admin task-manager response.');
        }

        expect(result.response.items.map((task) => task.id)).toEqual([
            'vps-self-update:recent',
            'chat-7h',
            'chat-10h',
            'vps-self-update:old',
        ]);
        expect(result.response.total).toBe(4);
    });
});
