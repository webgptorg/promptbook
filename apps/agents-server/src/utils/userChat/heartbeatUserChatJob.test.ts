import { describe, expect, it, jest } from '@jest/globals';
import { heartbeatUserChatJob } from './heartbeatUserChatJob';
import { USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS } from './userChatJobRuntimeConstants';
import { provideUserChatJobTable } from './provideUserChatJobTable';

jest.mock('./provideUserChatJobTable', () => ({
    provideUserChatJobTable: jest.fn(),
}));

/**
 * Minimal chainable Supabase-like builder used to test heartbeat timeout behaviour.
 *
 * @private test helper
 */
type MockHeartbeatQueryBuilder = {
    update: jest.MockedFunction<(payload: Record<string, unknown>) => MockHeartbeatQueryBuilder>;
    eq: jest.MockedFunction<(column: string, value: unknown) => MockHeartbeatQueryBuilder>;
    abortSignal: jest.MockedFunction<(signal: AbortSignal) => MockHeartbeatQueryBuilder>;
    select: jest.MockedFunction<(columns: string) => MockHeartbeatQueryBuilder>;
    maybeSingle: jest.MockedFunction<() => Promise<{ data: null; error: null }>>;
};

describe('heartbeatUserChatJob', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('aborts and surfaces a stable timeout error when the heartbeat query gets stuck', async () => {
        let rejectPendingQuery: ((reason: unknown) => void) | null = null;
        const queryBuilder = {} as MockHeartbeatQueryBuilder;

        queryBuilder.update = jest.fn(
            (_payload: Record<string, unknown>) => {
                void _payload;
                return queryBuilder;
            },
        ) as MockHeartbeatQueryBuilder['update'];
        queryBuilder.eq = jest.fn(
            (_column: string, _value: unknown) => {
                void _column;
                void _value;
                return queryBuilder;
            },
        ) as MockHeartbeatQueryBuilder['eq'];
        queryBuilder.abortSignal = jest.fn((signal) => {
            signal.addEventListener(
                'abort',
                () => {
                    rejectPendingQuery?.(new Error('AbortError'));
                },
                { once: true },
            );
            return queryBuilder;
        }) as MockHeartbeatQueryBuilder['abortSignal'];
        queryBuilder.select = jest.fn(
            (_columns: string) => {
                void _columns;
                return queryBuilder;
            },
        ) as MockHeartbeatQueryBuilder['select'];
        queryBuilder.maybeSingle = jest.fn(
            () =>
                new Promise<{ data: null; error: null }>((_resolve, reject) => {
                    rejectPendingQuery = reject;
                }),
        ) as MockHeartbeatQueryBuilder['maybeSingle'];

        jest.mocked(provideUserChatJobTable).mockResolvedValue(
            queryBuilder as unknown as Awaited<ReturnType<typeof provideUserChatJobTable>>,
        );

        const heartbeatPromise = heartbeatUserChatJob('job-timeout-1');
        await Promise.resolve();
        jest.advanceTimersByTime(USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS);
        await Promise.resolve();
        await expect(heartbeatPromise).rejects.toThrow(
            `Timed out while heartbeating user chat job "job-timeout-1" after ${USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS} ms.`,
        );
    });
});
