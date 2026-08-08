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

    it('parses raw wire header values which carry their own separator, folding, and line terminator', async () => {
        // Note: This is the shape Stalwart really sends - every value starts with the space after the
        //       colon, ends with CRLF, and folded values keep their inner line breaks
        const parsed = await parseInboundStalwartEmail({
            context: {
                stage: 'data',
                queue: { id: '47a69d24de01200' },
            },
            envelope: {
                from: { address: 'pavol@ptbk.io' },
                to: [{ address: 'novy.agent@live2.ptbk.io' }],
            },
            message: {
                serverHeaders: [['Received', ' from mail.example.net by live2.ptbk.io with ESMTPS\r\n']],
                headers: [
                    ['ARC-Seal', ' i=1; a=rsa-sha256; t=1786148996; cv=none;\r\n        d=google.com; s=arc-20260327\r\n'],
                    ['MIME-Version', ' 1.0\r\n'],
                    ['From', ' =?UTF-8?B?UGF2b2wgSGVqbsO9?= <pavol@ptbk.io>\r\n'],
                    ['Message-ID', ' <CAGmw0-dHX@mail.gmail.com>\r\n'],
                    ['Subject', ' Test\r\n'],
                    ['To', ' novy.agent@live2.ptbk.io\r\n'],
                    ['Content-Type', ' text/plain; charset="UTF-8"\r\n'],
                ],
                contents: 'Test\r\n',
            },
        });

        expect(parsed.email.sender).toBe('pavol@ptbk.io');
        expect(parsed.email.recipients).toEqual(['novy.agent@live2.ptbk.io']);
        expect(parsed.email.subject).toBe('Test');
        expect(parsed.email.metadata?.messageId).toBe('<CAGmw0-dHX@mail.gmail.com>');
        expect(parsed.email.content.trim()).toBe('Test');
        expect(parsed.email.content).not.toContain('ARC-Seal');
    });

    it('rejects a payload without any message header instead of parsing a headerless message', async () => {
        await expect(
            parseInboundStalwartEmail({
                context: { stage: 'data' },
                envelope: {
                    from: { address: 'pavol@ptbk.io' },
                    to: [{ address: 'novy.agent@live2.ptbk.io' }],
                },
                message: { headers: [], serverHeaders: [], contents: 'Test\r\n' },
            }),
        ).rejects.toBeInstanceOf(ParseError);
    });

    it('rejects non-DATA stages with a branded parse error', async () => {
        await expect(
            parseInboundStalwartEmail({
                context: { stage: 'RCPT' },
            }),
        ).rejects.toBeInstanceOf(ParseError);
    });
});
