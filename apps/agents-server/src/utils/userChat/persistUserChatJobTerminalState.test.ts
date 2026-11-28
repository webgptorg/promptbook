import { spaceTrim } from 'spacetrim';
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
/**
 * Constant for email chat reply mock.
 */
const sendEmailChatReplyMock = jest.fn<(options: unknown) => Promise<void>>();

jest.mock('./finalizeUserChatJob', () => ({
    finalizeUserChatJob: (options: unknown) => finalizeUserChatJobMock(options),
}));

jest.mock('../sendUserChatPushNotification', () => ({
    sendUserChatPushNotification: (options: unknown) => sendUserChatPushNotificationMock(options),
}));

jest.mock('./updateUserChatAssistantMessage', () => ({
    updateUserChatAssistantMessage: (options: unknown) => updateUserChatAssistantMessageMock(options),
}));

jest.mock('../email/sendEmailChatReply', () => ({
    sendEmailChatReply: (options: unknown) => sendEmailChatReplyMock(options),
}));

import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';

describe('persistUserChatJobTerminalState', () => {
    beforeEach(() => {
        finalizeUserChatJobMock.mockReset();
        sendUserChatPushNotificationMock.mockReset();
        updateUserChatAssistantMessageMock.mockReset();
        sendEmailChatReplyMock.mockReset();
        finalizeUserChatJobMock.mockResolvedValue(null);
        sendUserChatPushNotificationMock.mockResolvedValue(undefined);
        sendEmailChatReplyMock.mockResolvedValue(undefined);
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
                failureDetails: spaceTrim(`
                    {
                      "summary": "Chat missing."
                    }
                `),
            }),
        ).resolves.toBeUndefined();

        expect(finalizeUserChatJobMock).toHaveBeenCalledWith({
            jobId: 'job-123',
            status: 'FAILED',
            provider: undefined,
            failureReason: 'Chat missing.',
            failureDetails: spaceTrim(`
                {
                  "summary": "Chat missing."
                }
            `),
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
            rawPromptContent: spaceTrim(`
                SYSTEM
                Hello there
            `),
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

        const mutateMessage = (
            updateUserChatAssistantMessageMock.mock.calls[0]?.[0] as {
                mutateMessage: (message: Record<string, unknown>) => Record<string, unknown>;
            }
        ).mutateMessage;

        expect(
            mutateMessage({
                content: '',
                isComplete: false,
            }).prompt,
        ).toBe(prompt);
    });

    it('uses the runner completion time as the completed assistant message timestamp', async () => {
        const EXECUTED_AT = '2026-08-15T09:31:57.500Z' as NonNullable<
            Parameters<typeof persistUserChatJobTerminalState>[0]['executedAt']
        >;
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
            executedAt: EXECUTED_AT,
            generationDurationMs: 117_500,
        });

        const mutateMessage = (
            updateUserChatAssistantMessageMock.mock.calls[0]?.[0] as {
                mutateMessage: (message: Record<string, unknown>) => Record<string, unknown>;
            }
        ).mutateMessage;

        expect(
            mutateMessage({
                createdAt: '2026-08-15T09:00:00.000Z',
                generationDurationMs: 99_999,
            }),
        ).toMatchObject({
            createdAt: '2026-08-15T09:31:57.500Z',
            generationDurationMs: 117_500,
        });
    });

    it('sends completed email-chat answers through the email transport', async () => {
        updateUserChatAssistantMessageMock.mockResolvedValue({
            id: 'email-chat-123',
            userId: 3,
            source: 'EMAIL',
            messages: [
                {
                    id: 'assistant-123',
                    content: 'Email answer',
                },
            ],
        });

        await persistUserChatJobTerminalState({
            job: {
                id: 'job-123',
                userId: 3,
                agentPermanentId: 'agent-123',
                chatId: 'email-chat-123',
                assistantMessageId: 'assistant-123',
            },
            status: 'COMPLETED',
        });

        expect(sendEmailChatReplyMock).toHaveBeenCalledWith({
            jobId: 'job-123',
            content: 'Email answer',
        });
    });

    it('keeps the message chips out of the outbound email reply', async () => {
        const chipToolCall = {
            name: 'agent_project_touched',
            arguments: { projectName: 'my-website' },
            result: { projectName: 'my-website', displayName: 'My Website' },
        };
        let storedMessage: Record<string, unknown> | null = null;

        updateUserChatAssistantMessageMock.mockImplementation(async (options) => {
            const { mutateMessage } = options as {
                mutateMessage: (message: Record<string, unknown>) => Record<string, unknown>;
            };
            storedMessage = mutateMessage({ id: 'assistant-123', content: 'Email answer' });

            return { id: 'email-chat-123', userId: 3, source: 'EMAIL', messages: [storedMessage] };
        });

        await persistUserChatJobTerminalState({
            job: {
                id: 'job-123',
                userId: 3,
                agentPermanentId: 'agent-123',
                chatId: 'email-chat-123',
                assistantMessageId: 'assistant-123',
            },
            status: 'COMPLETED',
            content: 'Email answer',
            toolCalls: [chipToolCall],
        });

        // Note: The chips ride the assistant message, so they are visible when the email chat is
        //       opened in the Agents Server UI while the sent email stays plain text.
        expect(storedMessage).toMatchObject({ toolCalls: [chipToolCall] });
        expect(sendEmailChatReplyMock).toHaveBeenCalledWith({
            jobId: 'job-123',
            content: 'Email answer',
        });
    });
});
