import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Mocked shared scheduling action.
 */
const SET_PLANNED_MESSAGE_MOCK = jest.fn();

/**
 * Mocked shared listing action.
 */
const LIST_PLANNED_MESSAGES_MOCK = jest.fn();

/**
 * Mocked shared cancellation action.
 */
const CANCEL_PLANNED_MESSAGE_MOCK = jest.fn();

/**
 * Mocked agent collection used to recover canonical permanent ids from runner folder names.
 */
const FIND_AGENT_BASIC_INFORMATION_MOCK = jest.fn();

jest.mock('@/src/utils/agentGoalChat/agentGoalChatPlannedMessageActions', () => ({
    AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS: {
        set: SET_PLANNED_MESSAGE_MOCK,
        list: LIST_PLANNED_MESSAGES_MOCK,
        cancel: CANCEL_PLANNED_MESSAGE_MOCK,
    },
}));

jest.mock('@/src/utils/userChat', () => ({
    resolveUserChatWorkerInternalToken: jest.fn(),
}));

jest.mock('@/src/tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(),
}));

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveUserChatWorkerInternalToken } from '@/src/utils/userChat';
import { POST } from './route';

/**
 * Mocked internal-token resolver used by the route tests.
 */
const RESOLVE_USER_CHAT_WORKER_INTERNAL_TOKEN_MOCK = resolveUserChatWorkerInternalToken as jest.MockedFunction<
    typeof resolveUserChatWorkerInternalToken
>;

/**
 * Mocked collection provider used by internal planned-message route tests.
 */
const PROVIDE_AGENT_COLLECTION_FOR_SERVER_MOCK = $provideAgentCollectionForServer as jest.MockedFunction<
    typeof $provideAgentCollectionForServer
>;

describe('POST /api/internal/agent-goal-chat-planned-messages', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        RESOLVE_USER_CHAT_WORKER_INTERNAL_TOKEN_MOCK.mockReturnValue('test-worker-token');
        FIND_AGENT_BASIC_INFORMATION_MOCK.mockResolvedValue({ permanentId: 'agent-1' });
        PROVIDE_AGENT_COLLECTION_FOR_SERVER_MOCK.mockResolvedValue({
            findAgentBasicInformation: FIND_AGENT_BASIC_INFORMATION_MOCK,
        } as never);
    });

    it('rejects requests without the internal worker token', async () => {
        const response = await POST(createPlannedMessageRequest({ action: 'list', agentPermanentId: 'agent-1' }, ''));

        expect(response.status).toBe(401);
        expect(LIST_PLANNED_MESSAGES_MOCK).not.toHaveBeenCalled();
    });

    it('schedules a planned message through the shared goal-chat action', async () => {
        SET_PLANNED_MESSAGE_MOCK.mockResolvedValue({
            action: 'set',
            status: 'set',
            timeoutId: 'timeout-1',
            dueAt: '2026-08-11T13:00:00.000Z',
            message: 'Continue the goal.',
        });

        const response = await POST(
            createPlannedMessageRequest({
                action: 'set',
                agentPermanentId: 'agent-1',
                milliseconds: 60_000,
                message: 'Continue the goal.',
            }),
        );

        expect(response.status).toBe(200);
        expect(SET_PLANNED_MESSAGE_MOCK).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            milliseconds: 60_000,
            message: 'Continue the goal.',
        });
        await expect(response.json()).resolves.toMatchObject({
            status: 'set',
            timeoutId: 'timeout-1',
        });
    });

    it('uses the canonical permanent id when a runner folder lowercases it', async () => {
        FIND_AGENT_BASIC_INFORMATION_MOCK.mockResolvedValue({ permanentId: 'YznZWHGNQPinL1' });
        SET_PLANNED_MESSAGE_MOCK.mockResolvedValue({
            action: 'set',
            status: 'set',
            timeoutId: 'timeout-1',
            dueAt: '2026-08-11T13:00:00.000Z',
            message: 'Continue the goal.',
        });

        const response = await POST(
            createPlannedMessageRequest({
                action: 'set',
                agentPermanentId: 'yznzwhgnqpinl1',
                milliseconds: 60_000,
                message: 'Continue the goal.',
            }),
        );

        expect(response.status).toBe(200);
        expect(FIND_AGENT_BASIC_INFORMATION_MOCK).toHaveBeenCalledWith('yznzwhgnqpinl1');
        expect(SET_PLANNED_MESSAGE_MOCK).toHaveBeenCalledWith({
            agentPermanentId: 'YznZWHGNQPinL1',
            milliseconds: 60_000,
            message: 'Continue the goal.',
        });
    });

    it('lists and cancels planned messages through the same agent scope', async () => {
        LIST_PLANNED_MESSAGES_MOCK.mockResolvedValue({ action: 'list', status: 'listed', items: [], total: 0 });
        CANCEL_PLANNED_MESSAGE_MOCK.mockResolvedValue({
            action: 'cancel',
            status: 'cancelled',
            timeoutId: 'timeout-1',
        });

        const listResponse = await POST(
            createPlannedMessageRequest({
                action: 'list',
                agentPermanentId: 'agent-1',
                isIncludingFinished: true,
                limit: 10,
            }),
        );
        const cancelResponse = await POST(
            createPlannedMessageRequest({
                action: 'cancel',
                agentPermanentId: 'agent-1',
                timeoutId: 'timeout-1',
            }),
        );

        expect(listResponse.status).toBe(200);
        expect(cancelResponse.status).toBe(200);
        expect(LIST_PLANNED_MESSAGES_MOCK).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            isIncludingFinished: true,
            limit: 10,
        });
        expect(CANCEL_PLANNED_MESSAGE_MOCK).toHaveBeenCalledWith({
            agentPermanentId: 'agent-1',
            timeoutId: 'timeout-1',
        });
    });

    it('returns a branded parse failure for an unsupported action', async () => {
        const response = await POST(createPlannedMessageRequest({ action: 'reschedule', agentPermanentId: 'agent-1' }));

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
            error: expect.stringContaining('Invalid planned-message `action`'),
        });
    });
});

/**
 * Creates one internal planned-message request.
 */
function createPlannedMessageRequest(body: Record<string, unknown>, token = 'test-worker-token'): Request {
    return new Request('https://agents.example/api/internal/agent-goal-chat-planned-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-chat-worker-token': token,
        },
        body: JSON.stringify(body),
    });
}
