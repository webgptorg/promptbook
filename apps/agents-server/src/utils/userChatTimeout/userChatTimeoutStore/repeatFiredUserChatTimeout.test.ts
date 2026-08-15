import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { UserChatTimeoutRecord } from '../UserChatTimeoutRecord';
import { getUserChatTimeoutById } from './getUserChatTimeoutById';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';
import { repeatFiredUserChatTimeout } from './repeatFiredUserChatTimeout';

jest.mock('./getUserChatTimeoutById', () => ({
    getUserChatTimeoutById: jest.fn(),
}));

jest.mock('./provideUserChatTimeoutTable', () => ({
    provideUserChatTimeoutTable: jest.fn(),
}));

jest.mock('../../taskTerminal/taskTerminalLog', () => ({
    markTaskTerminalLogFinished: jest.fn(),
}));

/**
 * Stable timestamp shared by the repeating-timeout fixtures.
 */
const TEST_TIMESTAMP = '2026-08-15T12:00:00.000Z';

/**
 * Mocked single-timeout loader used by the repeating-timeout tests.
 */
const GET_USER_CHAT_TIMEOUT_BY_ID_MOCK = getUserChatTimeoutById as jest.MockedFunction<typeof getUserChatTimeoutById>;

/**
 * Mocked timeout table used by the repeating-timeout tests.
 */
const PROVIDE_USER_CHAT_TIMEOUT_TABLE_MOCK = provideUserChatTimeoutTable as jest.MockedFunction<
    typeof provideUserChatTimeoutTable
>;

describe('repeatFiredUserChatTimeout', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('re-arms one fired repeating timeout without changing its identity', async () => {
        const firedTimeout = createTimeoutFixture({ status: 'RUNNING', recurrenceIntervalMs: 300_000, runCount: 2 });
        const timeoutTableMock = createUserChatTimeoutTableMock();
        GET_USER_CHAT_TIMEOUT_BY_ID_MOCK.mockResolvedValue(firedTimeout);
        PROVIDE_USER_CHAT_TIMEOUT_TABLE_MOCK.mockResolvedValue(timeoutTableMock);

        const repeatedTimeout = await repeatFiredUserChatTimeout('timeout-1');

        const [updatePayload] = timeoutTableMock.update.mock.calls[0] as [Record<string, unknown>];
        expect(updatePayload).toMatchObject({
            status: 'QUEUED',
            startedAt: null,
            completedAt: null,
            leaseExpiresAt: null,
            runCount: 3,
        });
        expect(new Date(updatePayload.dueAt as string).getTime() - Date.now()).toBeGreaterThan(0);
        // Note: The very same row stays armed, so the agent can still cancel the timeout id it already knows
        expect(timeoutTableMock.eq.mock.calls).toEqual([
            ['id', 'timeout-1'],
            ['status', 'RUNNING'],
            ['runCount', 2],
        ]);
        expect(repeatedTimeout?.timeoutId).toBe('timeout-1');
        expect(repeatedTimeout?.status).toBe('QUEUED');
    });

    it('leaves one fired timeout that does not repeat to the completion path', async () => {
        const timeoutTableMock = createUserChatTimeoutTableMock();
        GET_USER_CHAT_TIMEOUT_BY_ID_MOCK.mockResolvedValue(createTimeoutFixture({ status: 'RUNNING' }));
        PROVIDE_USER_CHAT_TIMEOUT_TABLE_MOCK.mockResolvedValue(timeoutTableMock);

        await expect(repeatFiredUserChatTimeout('timeout-1')).resolves.toBeNull();
        expect(timeoutTableMock.update).not.toHaveBeenCalled();
    });

    it('stops repeating one planned message that was cancelled while it was firing', async () => {
        const timeoutTableMock = createUserChatTimeoutTableMock();
        GET_USER_CHAT_TIMEOUT_BY_ID_MOCK.mockResolvedValue(
            createTimeoutFixture({
                status: 'RUNNING',
                recurrenceIntervalMs: 300_000,
                cancelRequestedAt: TEST_TIMESTAMP,
            }),
        );
        PROVIDE_USER_CHAT_TIMEOUT_TABLE_MOCK.mockResolvedValue(timeoutTableMock);

        await expect(repeatFiredUserChatTimeout('timeout-1')).resolves.toBeNull();
        expect(timeoutTableMock.update).not.toHaveBeenCalled();
    });
});

/**
 * Creates one complete durable timeout fixture.
 *
 * @param overrides - Fields specific to one test case.
 * @returns Stored timeout record.
 */
function createTimeoutFixture(overrides: Partial<UserChatTimeoutRecord> = {}): UserChatTimeoutRecord {
    return {
        id: 'timeout-1',
        timeoutId: 'timeout-1',
        createdAt: TEST_TIMESTAMP,
        updatedAt: TEST_TIMESTAMP,
        chatId: 'goal-agent-1',
        userId: 42,
        agentPermanentId: 'agent-1',
        status: 'QUEUED',
        message: 'Check the emails.',
        parameters: {},
        durationMs: 300_000,
        dueAt: TEST_TIMESTAMP,
        recurrenceIntervalMs: null,
        queuedAt: TEST_TIMESTAMP,
        startedAt: null,
        completedAt: null,
        cancelRequestedAt: null,
        pausedAt: null,
        leaseExpiresAt: null,
        attemptCount: 1,
        runCount: 0,
        lastFiredAt: null,
        failureReason: null,
        ...overrides,
    };
}

/**
 * Creates one chained timeout-table mock returning the updated row.
 *
 * @returns Table mock together with the recorded query steps.
 */
function createUserChatTimeoutTableMock() {
    const maybeSingle = jest.fn(async () => ({
        data: {
            id: 'timeout-1',
            createdAt: TEST_TIMESTAMP,
            updatedAt: TEST_TIMESTAMP,
            chatId: 'goal-agent-1',
            userId: 42,
            agentPermanentId: 'agent-1',
            status: 'QUEUED',
            message: 'Check the emails.',
            parameters: {},
            durationMs: 300_000,
            dueAt: '2026-08-15T12:05:00.000Z',
            recurrenceIntervalMs: 300_000,
            queuedAt: TEST_TIMESTAMP,
            startedAt: null,
            completedAt: null,
            cancelRequestedAt: null,
            pausedAt: null,
            leaseExpiresAt: null,
            attemptCount: 1,
            runCount: 3,
            lastFiredAt: TEST_TIMESTAMP,
            failureReason: null,
        },
        error: null,
    }));
    const select = jest.fn(() => ({ maybeSingle }));
    const eq: jest.Mock = jest.fn(() => updateChain);
    const updateChain: { eq: jest.Mock; select: typeof select } = { eq, select };
    const update = jest.fn(() => updateChain);

    return { update, eq, select, maybeSingle } as never as {
        update: jest.Mock;
        eq: jest.Mock;
        select: jest.Mock;
        maybeSingle: jest.Mock;
    };
}
