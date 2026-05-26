import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { isAgentsServerSqliteMode } from '@/src/database/agentsServerDatabaseMode';
import { provideUserChatJobTable } from '../userChat/provideUserChatJobTable';
import { provideUserChatTimeoutTable } from '../userChatTimeout/userChatTimeoutStore/provideUserChatTimeoutTable';
import { getAdminChatTasks } from './getAdminChatTasks';

jest.mock('@/src/database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('@/src/database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

jest.mock('@/src/database/agentsServerDatabaseMode', () => ({
    isAgentsServerSqliteMode: jest.fn(),
}));

jest.mock('../userChat/provideUserChatJobTable', () => ({
    provideUserChatJobTable: jest.fn(),
}));

jest.mock('../userChatTimeout/userChatTimeoutStore/provideUserChatTimeoutTable', () => ({
    provideUserChatTimeoutTable: jest.fn(),
}));

/**
 * Minimal select-only table mock used by the SQLite task-manager tests.
 *
 * @private test helper
 */
type MockSelectOnlyTable = {
    select: jest.MockedFunction<(columns: string) => Promise<{ data: Array<unknown>; error: null }>>;
};

/**
 * Minimal Supabase lookup builder mock used for user and agent joins.
 *
 * @private test helper
 */
type MockLookupBuilder = {
    in: jest.MockedFunction<(column: string, values: Array<unknown>) => Promise<{ data: Array<unknown>; error: null }>>;
};

describe('getAdminChatTasks', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-05-26T01:00:00.000Z'));
        jest.mocked(isAgentsServerSqliteMode).mockReturnValue(true);
        jest.mocked($getTableName).mockImplementation(async (tableName) => tableName);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('loads admin task-manager rows through the SQLite adapters without requiring direct PostgreSQL access', async () => {
        mockSqliteAdminTaskData();

        const result = await getAdminChatTasks({
            page: 1,
            pageSize: 10,
            view: 'active',
            search: '',
            timeWindowHours: 24,
        });

        expect(result.total).toBe(2);
        expect(result.items.map((item) => item.id)).toEqual(['job-running-1', 'timeout-queued-1']);
        expect(result.items[0]).toMatchObject({
            username: 'alice',
            agentName: 'Alpha',
            queueName: 'user-chat-jobs',
        });
        expect(result.items[1]).toMatchObject({
            recurrenceIntervalMs: 60000,
            queueName: 'user-chat-timeouts',
        });
        expect(result.counters).toEqual({
            runningCount: 1,
            queuedCount: 1,
            failedLast24hCount: 1,
            oldestQueuedAgeMs: 3570000,
        });
    });

    it('matches admin task-manager search against joined usernames and agent names in SQLite mode', async () => {
        mockSqliteAdminTaskData();

        const result = await getAdminChatTasks({
            page: 1,
            pageSize: 10,
            view: 'all',
            search: 'ALP',
            timeWindowHours: 24,
        });

        expect(result.total).toBe(2);
        expect(result.items.map((item) => item.id)).toEqual(['job-running-1', 'timeout-queued-1']);
    });
});

/**
 * Wires the SQLite-mode mocks with one mixed task dataset and the related lookup rows.
 *
 * @private test helper
 */
function mockSqliteAdminTaskData(): void {
    const jobTable: MockSelectOnlyTable = {
        select: jest.fn(async (_columns: string) => {
            void _columns;
            return {
                data: [
                    {
                        id: 'job-running-1',
                        createdAt: '2026-05-26T00:00:00.000Z',
                        queuedAt: '2026-05-26T00:00:00.000Z',
                        startedAt: '2026-05-26T00:01:00.000Z',
                        updatedAt: '2026-05-26T00:02:00.000Z',
                        completedAt: null,
                        cancelRequestedAt: null,
                        lastHeartbeatAt: '2026-05-26T00:02:00.000Z',
                        leaseExpiresAt: '2026-05-26T00:03:00.000Z',
                        attemptCount: 1,
                        failureReason: null,
                        failureDetails: null,
                        userId: 1,
                        agentPermanentId: 'agent-1',
                        chatId: 'chat-running-1',
                        status: 'RUNNING',
                    },
                    {
                        id: 'job-failed-1',
                        createdAt: '2026-05-25T23:00:00.000Z',
                        queuedAt: '2026-05-25T23:00:00.000Z',
                        startedAt: '2026-05-25T23:01:00.000Z',
                        updatedAt: '2026-05-25T23:02:00.000Z',
                        completedAt: '2026-05-25T23:03:00.000Z',
                        cancelRequestedAt: null,
                        lastHeartbeatAt: '2026-05-25T23:02:00.000Z',
                        leaseExpiresAt: '2026-05-25T23:03:00.000Z',
                        attemptCount: 2,
                        failureReason: 'Runner failed.',
                        failureDetails: '{"summary":"Runner failed."}',
                        userId: 2,
                        agentPermanentId: 'agent-2',
                        chatId: 'chat-failed-1',
                        status: 'FAILED',
                    },
                ],
                error: null,
            };
        }),
    };
    const timeoutTable: MockSelectOnlyTable = {
        select: jest.fn(async (_columns: string) => {
            void _columns;
            return {
                data: [
                    {
                        id: 'timeout-queued-1',
                        createdAt: '2026-05-26T00:00:30.000Z',
                        queuedAt: '2026-05-26T00:00:30.000Z',
                        startedAt: null,
                        updatedAt: '2026-05-26T00:00:30.000Z',
                        completedAt: null,
                        cancelRequestedAt: null,
                        pausedAt: null,
                        leaseExpiresAt: null,
                        recurrenceIntervalMs: '60000',
                        attemptCount: 1,
                        failureReason: null,
                        userId: 1,
                        agentPermanentId: 'agent-1',
                        chatId: 'chat-timeout-1',
                        status: 'QUEUED',
                    },
                ],
                error: null,
            };
        }),
    };
    const mockSupabase = {
        from: jest.fn((tableName: string) => ({
            select: jest.fn((_columns: string) => {
                void _columns;
                const lookupBuilder: MockLookupBuilder = {
                    in: jest.fn(async (_column: string, _values: Array<unknown>) => {
                        void _column;
                        void _values;

                        if (tableName === 'User') {
                            return {
                                data: [
                                    { id: 1, username: 'alice' },
                                    { id: 2, username: 'bob' },
                                ],
                                error: null,
                            };
                        }

                        return {
                            data: [
                                { permanentId: 'agent-1', agentName: 'Alpha' },
                                { permanentId: 'agent-2', agentName: 'Beta' },
                            ],
                            error: null,
                        };
                    }),
                };

                return lookupBuilder;
            }),
        })),
    };

    jest.mocked(provideUserChatJobTable).mockResolvedValue(
        jobTable as unknown as Awaited<ReturnType<typeof provideUserChatJobTable>>,
    );
    jest.mocked(provideUserChatTimeoutTable).mockResolvedValue(
        timeoutTable as unknown as Awaited<ReturnType<typeof provideUserChatTimeoutTable>>,
    );
    jest.mocked($provideSupabaseForServer).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof $provideSupabaseForServer>,
    );
}
