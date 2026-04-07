import { describe, expect, it, jest } from '@jest/globals';
import { UserChatScopeError } from './UserChatScopeError';

const finalizeUserChatJobMock = jest.fn<(options: unknown) => Promise<unknown>>();
const sendUserChatPushNotificationMock = jest.fn<(options: unknown) => Promise<void>>();
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
});
