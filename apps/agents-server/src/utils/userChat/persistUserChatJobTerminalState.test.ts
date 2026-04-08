import { describe, expect, it, jest } from '@jest/globals';
import { UserChatScopeError } from './UserChatScopeError';

/**
 * Constant for finalize user chat job mock.
 */
const finalizeUserChatJobMock = jest.fn<(options: unknown) => Promise<unknown>>();
/**
 * Constant for send user chat push notification mock.
 */
const sendUserChatPushNotificationMock = jest.fn<(options: unknown) => Promise<void>>();
/**
 * Constant for update user chat assistant message mock.
 */
const updateUserChatAssistantMessageMock = jest.fn<(options: unknown) => Promise<unknown>>();

jest.mock('./finalizeUserChatJob', () => ({
    finalizeUserChatJob: (options: unknown) => finalizeUserChatJobMock(options),
}));

jest.mock('../sendUserChatPushNotification', () => ({
    sendUserChatPushNotification: (options: unknown) => sendUserChatPushNotificationMock(options),
}));

jest.mock('./updateUserChatAssistantMessage', () => ({
    updateUserChatAssistantMessage: (options: unknown) => updateUserChatAssistantMessageMock(options),
}));

import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';

describe('persistUserChatJobTerminalState', () => {
    beforeEach(() => {
        finalizeUserChatJobMock.mockReset();
        sendUserChatPushNotificationMock.mockReset();
        updateUserChatAssistantMessageMock.mockReset();
        finalizeUserChatJobMock.mockResolvedValue(null);
        sendUserChatPushNotificationMock.mockResolvedValue(undefined);
    });

    it('finalizes the durable job even when the chat row disappears before assistant-state persistence', async () => {
        updateUserChatAssistantMessageMock.mockRejectedValue(
            new UserChatScopeError('USER_CHAT_NOT_FOUND', 'Chat missing.', {
                operation: 'mutate_chat',
                requestedScope: {
                    userId: 3,
                    agentPermanentId: 'agent-123',
                    chatId: 'chat-123',
                },
                locatedScope: null,
                likelyCause: 'Chat row was deleted.',
            }),
        );

        await expect(
            persistUserChatJobTerminalState({
                job: {
                    id: 'job-123',
                    userId: 3,
                    agentPermanentId: 'agent-123',
                    chatId: 'chat-123',
                    assistantMessageId: 'assistant-123',
                },
                status: 'FAILED',
                failureReason: 'Chat missing.',
                failureDetails: '{\n  "summary": "Chat missing."\n}',
            }),
        ).resolves.toBeUndefined();

        expect(finalizeUserChatJobMock).toHaveBeenCalledWith({
            jobId: 'job-123',
            status: 'FAILED',
            provider: undefined,
            failureReason: 'Chat missing.',
            failureDetails: '{\n  "summary": "Chat missing."\n}',
        });
        expect(sendUserChatPushNotificationMock).not.toHaveBeenCalled();
    });

    it('persists the prompt snapshot into the assistant message payload', async () => {
        const prompt: NonNullable<Parameters<typeof persistUserChatJobTerminalState>[0]['prompt']> = {
            title: 'Chat with agent Example',
            content: 'Hello there',
            parameters: { language: 'en' },
            modelRequirements: { modelVariant: 'CHAT' },
            availableTools: [
                {
                    name: 'web_search',
                    description: 'Search the web',
                    parameters: {
                        type: 'object',
                        properties: {},
                    },
                },
            ],
            toolCalls: [{ name: 'web_search', arguments: { query: 'hello' } }],
            completedToolCalls: [{ name: 'web_search', arguments: { query: 'hello' }, result: 'done' }],
            rawPromptContent: 'SYSTEM\nHello there',
            rawRequest: { provider: 'test' },
        };

        updateUserChatAssistantMessageMock.mockResolvedValue({
            id: 'chat-123',
            userId: 3,
            messages: [],
        });

        await persistUserChatJobTerminalState({
            job: {
                id: 'job-123',
                userId: 3,
                agentPermanentId: 'agent-123',
                chatId: 'chat-123',
                assistantMessageId: 'assistant-123',
            },
            status: 'COMPLETED',
            prompt,
        });

        const mutateMessage = (updateUserChatAssistantMessageMock.mock.calls[0]?.[0] as {
            mutateMessage: (message: Record<string, unknown>) => Record<string, unknown>;
        }).mutateMessage;

        expect(
            mutateMessage({
                content: '',
                isComplete: false,
            }).prompt,
        ).toBe(prompt);
    });
});
