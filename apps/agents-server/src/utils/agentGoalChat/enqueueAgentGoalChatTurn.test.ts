import { describe, expect, it, jest } from '@jest/globals';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { UserChatRecord } from '../userChat/UserChatRecord';
import {
    createAgentGoalChatLifecycleClientMessageId,
    createAgentGoalChatTurnEnqueuer,
} from './enqueueAgentGoalChatTurn';

/**
 * Stable goal chat used by autonomous-turn tests.
 */
const TEST_GOAL_CHAT = {
    id: 'goal-agent-1',
    userId: 42,
    agentPermanentId: 'agent-1',
} as UserChatRecord;

/**
 * Stable durable job used by autonomous-turn tests.
 */
const TEST_GOAL_CHAT_JOB = {
    id: 'job-1',
    userId: 42,
    agentPermanentId: 'agent-1',
    chatId: 'goal-agent-1',
    clientMessageId: 'goal-lifecycle:source-hash',
    status: 'QUEUED',
} as UserChatJobRecord;

describe('enqueueAgentGoalChatTurn', () => {
    it('enqueues an agent-authored turn in the singleton goal chat and wakes its worker', async () => {
        const ensureAgentGoalChat = jest.fn(async () => TEST_GOAL_CHAT);
        const appendQueuedUserChatTurn = jest.fn(async () => ({
            chat: TEST_GOAL_CHAT,
            job: TEST_GOAL_CHAT_JOB,
        }));
        const getUserChatJobByClientMessageId = jest.fn(async () => null);
        const triggerUserChatJobWorker = jest.fn(async () => undefined);
        const enqueueAgentGoalChatTurn = createAgentGoalChatTurnEnqueuer({
            ensureAgentGoalChat,
            appendQueuedUserChatTurn,
            getUserChatJobByClientMessageId,
            resolveCurrentOrInternalServerOrigin: async () => 'https://agents.example',
            triggerUserChatJobWorker,
        });

        const result = await enqueueAgentGoalChatTurn({
            agentPermanentId: 'agent-1',
            content: 'My current goal is to publish a useful update.',
            sourceFingerprint: 'source-hash',
            trigger: 'MODIFIED',
        });

        expect(result).toBe(TEST_GOAL_CHAT_JOB);
        expect(appendQueuedUserChatTurn).toHaveBeenCalledWith({
            userId: 42,
            agentPermanentId: 'agent-1',
            chatId: 'goal-agent-1',
            clientMessageId: 'goal-lifecycle:source-hash',
            messageContent: 'My current goal is to publish a useful update.',
            messageSender: 'AGENT',
            parameters: {
                agentGoalChatTrigger: 'MODIFIED',
                agentGoalChatSourceFingerprint: 'source-hash',
            },
        });
        expect(triggerUserChatJobWorker).toHaveBeenCalledWith({
            origin: 'https://agents.example',
            preferredJobId: 'job-1',
        });
    });

    it('reuses a source-version job instead of creating a second goal-chat turn', async () => {
        const appendQueuedUserChatTurn = jest.fn();
        const triggerUserChatJobWorker = jest.fn();
        const enqueueAgentGoalChatTurn = createAgentGoalChatTurnEnqueuer({
            ensureAgentGoalChat: async () => TEST_GOAL_CHAT,
            appendQueuedUserChatTurn,
            getUserChatJobByClientMessageId: async () => TEST_GOAL_CHAT_JOB,
            resolveCurrentOrInternalServerOrigin: async () => 'https://agents.example',
            triggerUserChatJobWorker,
        });

        const result = await enqueueAgentGoalChatTurn({
            agentPermanentId: 'agent-1',
            content: 'My current goal is unchanged.',
            sourceFingerprint: 'source-hash',
            trigger: 'CREATED',
        });

        expect(result).toBe(TEST_GOAL_CHAT_JOB);
        expect(appendQueuedUserChatTurn).not.toHaveBeenCalled();
        expect(triggerUserChatJobWorker).not.toHaveBeenCalled();
    });

    it('builds one stable lifecycle client message id per source version', () => {
        expect(createAgentGoalChatLifecycleClientMessageId('source-hash')).toBe('goal-lifecycle:source-hash');
    });
});
