import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../message-providers', () => ({
    EMAIL_PROVIDERS: {},
}));

jest.mock('./createMessage', () => ({
    createMessage: jest.fn(),
}));

jest.mock('./sendMessageAttempt', () => ({
    sendMessageAttempt: jest.fn(),
}));

import type { OutboundEmail } from '../../message-providers/email/_common/Email';
import type { MessageProvider } from '../../message-providers/interfaces/MessageProvider';
import { createMessage } from './createMessage';
import { sendMessageAttempt } from './sendMessageAttempt';
import { sendMessage } from './sendMessage';

describe('sendMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('humanizes outbound email text before persistence and provider delivery', async () => {
        const sourceMarker = '\u30105:1\u2020source\u3011';
        const email: OutboundEmail = {
            channel: 'EMAIL',
            direction: 'OUTBOUND',
            sender: 'agent@example.com',
            recipients: ['recipient@example.com'],
            cc: [],
            subject: '“Quarterly update…”',
            content: `Hello — here is the summary${sourceMarker}.`,
            attachments: [],
            metadata: {
                subject: '“Quarterly update…”',
                tag: 'newsletter',
            },
        };
        const provider: MessageProvider = {
            send: jest.fn(async () => ({ id: 'provider-message-id' })),
        };

        jest.mocked(createMessage).mockResolvedValue({
            id: 123,
        } as Awaited<ReturnType<typeof createMessage>>);
        jest.mocked(sendMessageAttempt).mockResolvedValue({
            attemptId: 456,
            providerName: 'SMTP',
            isSuccessful: true,
            raw: { id: 'provider-message-id' },
        });

        const result = await sendMessage(email, {
            providers: [
                {
                    providerName: 'SMTP',
                    provider,
                },
            ],
        });

        const expectedEmail: OutboundEmail = {
            ...email,
            subject: '"Quarterly update..."',
            content: 'Hello - here is the summary.',
            metadata: {
                subject: '"Quarterly update..."',
                tag: 'newsletter',
            },
        };

        expect(createMessage).toHaveBeenCalledWith(expectedEmail);
        expect(sendMessageAttempt).toHaveBeenCalledWith({
            messageId: 123,
            providerName: 'SMTP',
            provider,
            message: expectedEmail,
        });
        expect(result).toEqual({
            messageId: 123,
            status: 'sent',
            attempts: [
                {
                    attemptId: 456,
                    providerName: 'SMTP',
                    isSuccessful: true,
                    raw: { id: 'provider-message-id' },
                },
            ],
        });
        expect(email.subject).toBe('“Quarterly update…”');
        expect(email.content).toBe(`Hello — here is the summary${sourceMarker}.`);
    });
});
