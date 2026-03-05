import { describe, expect, it } from '@jest/globals';
import type { OutboundEmail } from '../../message-providers/email/_common/Email';
import { humanizeOutboundEmail } from './humanizeOutboundEmail';

describe('humanizeOutboundEmail', () => {
    it('humanizes subject and body while preserving other email fields', () => {
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

        const result = humanizeOutboundEmail(email);

        expect(result.subject).toBe('"Quarterly update..."');
        expect(result.content).toBe('Hello - here is the summary.');
        expect(result.metadata).toEqual({
            subject: '"Quarterly update..."',
            tag: 'newsletter',
        });
        expect(result.sender).toBe(email.sender);
        expect(result.recipients).toEqual(email.recipients);
        expect(result.cc).toEqual(email.cc);
        expect(result.attachments).toEqual(email.attachments);
        expect(email.subject).toBe('“Quarterly update…”');
        expect(email.content).toBe(`Hello — here is the summary${sourceMarker}.`);
    });
});
