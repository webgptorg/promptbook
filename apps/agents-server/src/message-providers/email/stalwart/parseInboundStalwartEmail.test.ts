import { ParseError } from '../../../../../../src/errors/ParseError';
import { parseInboundStalwartEmail } from './parseInboundStalwartEmail';

describe('parseInboundStalwartEmail', () => {
    it('preserves the SMTP envelope while parsing RFC email headers and content', async () => {
        const parsed = await parseInboundStalwartEmail({
            context: {
                stage: 'DATA',
                queue: { id: 'queue-123' },
            },
            envelope: {
                from: { address: 'sender+campaign@example.net' },
                to: [{ address: 'john.doe+test@agents-server.com' }],
            },
            message: {
                headers: [
                    ['From', '"Sender, Jane" <sender+campaign@example.net>'],
                    ['To', '"Doe, John" <john.doe+test@agents-server.com>'],
                    ['Cc', 'Observer <observer@example.org>'],
                    ['Subject', 'Question for John'],
                    ['Message-ID', '<message-123@example.net>'],
                ],
                serverHeaders: [['Received', 'by mail.agents-server.com']],
                contents: 'Hello from email.\r\n',
            },
        });

        expect(parsed.envelopeSender).toBe('sender+campaign@example.net');
        expect(parsed.envelopeRecipients).toEqual(['john.doe+test@agents-server.com']);
        expect(parsed.queueId).toBe('queue-123');
        expect(parsed.email.sender).toBe('sender+campaign@example.net');
        expect(parsed.email.recipients).toEqual(['john.doe+test@agents-server.com']);
        expect(parsed.email.cc.map((address) => address.fullEmail)).toEqual(['observer@example.org']);
        expect(parsed.email.subject).toBe('Question for John');
        expect(parsed.email.content).toContain('Hello from email.');
        expect(parsed.email.metadata?.messageId).toBe('<message-123@example.net>');
    });

    it('rejects non-DATA stages with a branded parse error', async () => {
        await expect(
            parseInboundStalwartEmail({
                context: { stage: 'RCPT' },
            }),
        ).rejects.toBeInstanceOf(ParseError);
    });
});
