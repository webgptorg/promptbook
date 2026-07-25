import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ServerContextRun } from '../tools/mapRegisteredServerContexts';
import type { AdminChatTaskCounters, AdminChatTaskRecord } from './chatTasksAdmin';
import type { GetAdminChatTasksData } from './getAdminChatTasksResponse/getAdminChatTasks';
import type { ServerRecord } from './serverRegistry';
import { getDefaultVpsSelfUpdateEnvironment } from './vpsSelfUpdate/vpsSelfUpdateEnvironment';
import type { VpsSelfUpdateJobSnapshot } from './vpsSelfUpdate/vpsSelfUpdateTypes';

jest.mock('@/src/utils/userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped', () => ({
    ensureUserChatTimeoutWorkerBootstrapped: jest.fn(),
}));

jest.mock('../tools/mapRegisteredServerContexts', () => ({
    mapRegisteredServerContexts: jest.fn(),
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

import { mapRegisteredServerContexts } from '../tools/mapRegisteredServerContexts';
import { getAdminChatTasks } from './getAdminChatTasksResponse/getAdminChatTasks';
import { getVpsAdminChatTasksResponse } from './getVpsAdminChatTasksResponse';
import { readVpsSelfUpdateJobTaskSnapshots } from './vpsSelfUpdate';

/**
 * Fixed reference time so relative task timestamps stay inside the default `All` window.
 *
 * @private test constant of `getVpsAdminChatTasksResponse`
 */
const REFERENCE_TIMESTAMP = Date.parse('2026-07-07T12:00:00.000Z');

/**
 * Builds one ISO timestamp a whole number of hours before the fixed reference time.
 *
 * @private test helper of `getVpsAdminChatTasksResponse`
 */
function hoursBeforeReferenceIso(hours: number): string {
    return new Date(REFERENCE_TIMESTAMP - hours * 60 * 60 * 1000).toISOString();
}

/**
 * Builds one fake registered server row for the fan-out mock.
 *
 * @private test helper of `getVpsAdminChatTasksResponse`
 */
function createServerRecord(name: string): ServerRecord {
    return {
        id: 1,
        name,
        environment: 'PRODUCTION',
        domain: `${name}.example.com`,
        tablePrefix: `${name}_`,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };
}

/**
 * Builds one finished chat-completion row as one server's database loader would return it.
 *
 * @private test helper of `getVpsAdminChatTasksResponse`
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
 * @private test helper of `getVpsAdminChatTasksResponse`
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

/**
 * Makes the mocked `mapRegisteredServerContexts` run the callback once per given server, mirroring
 * the real per-server routing so `getAdminChatTasks` is consulted once per server.
 *
 * @private test helper of `getVpsAdminChatTasksResponse`
 */
function mockServerContexts(servers: ReadonlyArray<ServerRecord | null>): void {
    jest.mocked(mapRegisteredServerContexts).mockImplementation(async (callback) => {
        const serverRuns: Array<ServerContextRun<Awaited<ReturnType<typeof callback>>>> = [];
        for (const server of servers) {
            serverRuns.push({ server, value: await callback(server) });
        }
        return serverRuns;
    });
}

describe('getVpsAdminChatTasksResponse · aggregates every server on the VPS', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(REFERENCE_TIMESTAMP));
        jest.mocked(readVpsSelfUpdateJobTaskSnapshots).mockResolvedValue([]);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('tags each row with its server, injects VPS tasks once, and sums counters and totals', async () => {
        mockServerContexts([createServerRecord('lts'), createServerRecord('lts1')]);

        // Each server returns its own durable rows and counters; the fan-out must keep them separate.
        jest.mocked(getAdminChatTasks)
            .mockResolvedValueOnce({
                items: [createFinishedChatTaskRecord('lts-chat-7h', 7)],
                total: 1,
                counters: { runningCount: 1, queuedCount: 0, failedLast24hCount: 0, oldestQueuedAgeMs: null },
            } satisfies GetAdminChatTasksData)
            .mockResolvedValueOnce({
                items: [createFinishedChatTaskRecord('lts1-chat-3h', 3)],
                total: 1,
                counters: { runningCount: 0, queuedCount: 2, failedLast24hCount: 1, oldestQueuedAgeMs: 5_000 },
            } satisfies GetAdminChatTasksData);

        // One process-local VPS self-update finished 10h ago: it belongs to the VPS, not to any single server.
        jest.mocked(readVpsSelfUpdateJobTaskSnapshots).mockResolvedValue([
            createSucceededSelfUpdateSnapshot('old', 10),
        ]);

        const result = await getVpsAdminChatTasksResponse(new URLSearchParams({ view: 'all' }));

        expect(result.status).toBe(200);
        if (result.status !== 200) {
            throw new Error('Expected a successful VPS-wide task-manager response.');
        }

        // Ordered most-recently-finished first across both servers, with the VPS self-update injected exactly once.
        expect(result.response.items.map((task) => task.id)).toEqual([
            'lts1-chat-3h',
            'lts-chat-7h',
            'vps-self-update:old',
        ]);

        // Every database row is tagged with the server it came from; the VPS-level self-update is not.
        const serverByTaskId = new Map(result.response.items.map((task) => [task.id, task.serverName ?? null]));
        expect(serverByTaskId.get('lts-chat-7h')).toBe('lts');
        expect(serverByTaskId.get('lts1-chat-3h')).toBe('lts1');
        expect(serverByTaskId.get('vps-self-update:old') ?? null).toBeNull();

        // Total = both servers' durable totals + the single injected VPS task.
        expect(result.response.total).toBe(3);

        // Counters are summed across servers (the succeeded self-update contributes to none of them).
        expect(result.response.counters).toEqual({
            runningCount: 1,
            queuedCount: 2,
            failedLast24hCount: 1,
            oldestQueuedAgeMs: 5_000,
        } satisfies AdminChatTaskCounters);
    });

    it('runs once in the ambient context and reports no rows when the VPS has no registered servers', async () => {
        mockServerContexts([null]);
        jest.mocked(getAdminChatTasks).mockResolvedValue({
            items: [],
            total: 0,
            counters: { runningCount: 0, queuedCount: 0, failedLast24hCount: 0, oldestQueuedAgeMs: null },
        } satisfies GetAdminChatTasksData);

        const result = await getVpsAdminChatTasksResponse(new URLSearchParams({ view: 'all' }));

        expect(result.status).toBe(200);
        if (result.status !== 200) {
            throw new Error('Expected a successful VPS-wide task-manager response.');
        }

        expect(result.response.items).toEqual([]);
        expect(result.response.total).toBe(0);
        expect(jest.mocked(getAdminChatTasks)).toHaveBeenCalledTimes(1);
    });
});
