import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Durable job lookup mock.
 */
const getUserChatJobByIdMock = jest.fn<(jobId: string) => Promise<{ parameters: Record<string, unknown> } | null>>();

/**
 * Outbound Stalwart delivery mock.
 */
const sendEmailThroughStalwartMock = jest.fn<(message: unknown) => Promise<void>>();

/**
 * Terminal query mock used by the Message idempotency lookup.
 */
const limitMock = jest.fn<() => Promise<{ data: unknown[]; error: null }>>();

jest.mock('../userChat/getUserChatJobById', () => ({
    getUserChatJobById: (jobId: string) => getUserChatJobByIdMock(jobId),
}));

jest.mock('./sendEmailThroughStalwart', () => ({
    sendEmailThroughStalwart: (message: unknown) => sendEmailThroughStalwartMock(message),
}));

jest.mock('../../database/$getTableName', () => ({
    $getTableName: async () => 'Message',
}));

jest.mock('../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: async () => {
        const query = {
            select: () => query,
            eq: () => query,
            limit: () => limitMock(),
        };
        return {
            from: () => query,
        };
    },
}));

import { sendEmailChatReply } from './sendEmailChatReply';

describe('sendEmailChatReply', () => {
    beforeEach(() => {
        getUserChatJobByIdMock.mockReset();
        sendEmailThroughStalwartMock.mockReset();
        limitMock.mockReset();
        limitMock.mockResolvedValue({ data: [], error: null });
        sendEmailThroughStalwartMock.mockResolvedValue(undefined);
    });

    it('replies to all participants from the exact plus-tagged alias that received the email', async () => {
        getUserChatJobByIdMock.mockResolvedValue({
            parameters: {
                emailContext: {
                    agentDisplayName: 'John Doe',
                    agentLocalParts: ['john.doe', 'johndoe'],
                    sender: 'sender+campaign@example.net',
                    to: [
                        'john.doe+test@agents-server.com',
                        'observer@example.org',
                        'sender+campaign@example.net',
                    ],
                    cc: ['Other Person <other@example.org>', 'johndoe@agents-server.com'],
                    deliveredTo: 'john.doe+test@agents-server.com',
                    subject: 'Question',
                    messageId: '<message-123@example.net>',
                    references: ['<older@example.net>'],
                },
            },
        });

        await sendEmailChatReply({
            jobId: 'job-123',
            content: 'The answer.',
        });

        expect(sendEmailThroughStalwartMock).toHaveBeenCalledTimes(1);
        expect(sendEmailThroughStalwartMock).toHaveBeenCalledWith(
            expect.objectContaining({
                sender: '"John Doe" <john.doe+test@agents-server.com>',
                recipients: ['sender+campaign@example.net', 'observer@example.org'],
                subject: 'Re: Question',
                content: 'The answer.',
                metadata: expect.objectContaining({
                    inReplyTo: '<message-123@example.net>',
                    references: ['<older@example.net>', '<message-123@example.net>'],
                }),
            }),
        );
        const sentEmail = sendEmailThroughStalwartMock.mock.calls[0]?.[0] as {
            cc: ReadonlyArray<{ fullEmail: string }>;
        };
        expect(sentEmail.cc.map((recipient) => recipient.fullEmail)).toEqual(['other@example.org']);
    });
});
