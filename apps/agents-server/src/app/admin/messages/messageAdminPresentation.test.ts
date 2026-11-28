import type { Json } from '../../../database/schema';
import type { MessageSendAttemptRow } from '../../../utils/messagesAdmin';
import {
    formatMessageSendAttemptLog,
    normalizeMessageContacts,
    resolveLatestMessageSendAttemptErrorMessage,
    resolveMessageStatusPresentation,
} from './messageAdminPresentation';

/**
 * Builds one persisted delivery attempt for presentation tests.
 */
function createMessageSendAttempt(overrides: Partial<MessageSendAttemptRow> = {}): MessageSendAttemptRow {
    return {
        id: 7,
        createdAt: '2026-08-11T16:59:30.654Z',
        messageId: 17,
        providerName: 'STALWART',
        isSuccessful: false,
        raw: {
            error: {
                name: 'Error',
                message: 'connect ECONNREFUSED 127.0.0.1:587',
                stack: 'Error: connect ECONNREFUSED 127.0.0.1:587\n    at TCPConnectWrap.afterConnect',
            },
        },
        ...overrides,
    };
}

describe('message admin presentation', () => {
    it('formats named senders and recipient arrays without exposing JSON syntax', () => {
        expect(normalizeMessageContacts('"Nový agent" <novy.agent@live2.ptbk.io>')).toEqual([
            {
                fullName: 'Nový agent',
                address: 'novy.agent@live2.ptbk.io',
                isEmail: true,
            },
        ]);
        expect(normalizeMessageContacts(['pavol@ptbk.io', 'me@pavolhejny.com'])).toEqual([
            {
                fullName: null,
                address: 'pavol@ptbk.io',
                isEmail: true,
            },
            {
                fullName: null,
                address: 'me@pavolhejny.com',
                isEmail: true,
            },
        ]);
    });

    it('recognizes an inbound database row as received without requiring a send attempt', () => {
        expect(resolveMessageStatusPresentation('INBOUND', [])).toEqual({
            kind: 'received',
            attemptCount: 0,
            providerName: null,
        });
    });

    it('keeps outbound attempt semantics for pending, sent, and failed messages', () => {
        expect(resolveMessageStatusPresentation('OUTBOUND', [])).toEqual({
            kind: 'pending',
            attemptCount: 0,
            providerName: null,
        });
        expect(
            resolveMessageStatusPresentation('OUTBOUND', [
                createMessageSendAttempt({ isSuccessful: true, providerName: 'SMTP' }),
            ]),
        ).toEqual({
            kind: 'sent',
            attemptCount: 1,
            providerName: 'SMTP',
        });
        expect(resolveMessageStatusPresentation('OUTBOUND', [createMessageSendAttempt()])).toEqual({
            kind: 'failed',
            attemptCount: 1,
            providerName: null,
        });
    });

    it('shows the latest provider error and preserves the complete raw stack in its log', () => {
        const earlierAttempt = createMessageSendAttempt({
            id: 1,
            createdAt: '2026-08-11T12:17:56.489Z',
            raw: {
                error: {
                    message: 'Earlier failure',
                },
            },
        });
        const latestAttempt = createMessageSendAttempt();

        expect(resolveLatestMessageSendAttemptErrorMessage([latestAttempt, earlierAttempt])).toBe(
            'connect ECONNREFUSED 127.0.0.1:587',
        );

        const log = formatMessageSendAttemptLog(latestAttempt);
        expect(log).toContain('Attempt ID: 7');
        expect(log).toContain('Provider: STALWART');
        expect(log).toContain('Message: connect ECONNREFUSED 127.0.0.1:587');
        expect(log).toContain('Stack:\nError: connect ECONNREFUSED 127.0.0.1:587\n    at TCPConnectWrap.afterConnect');
        expect(log).toContain('Raw provider response:');
        expect(log).toContain('"stack": "Error: connect ECONNREFUSED 127.0.0.1:587\\n');
    });

    it('reads raw JSON text retained by older database adapters', () => {
        const raw = JSON.stringify({ error: { message: 'Legacy serialized failure' } }) as Json;
        const attempt = createMessageSendAttempt({ raw });

        expect(resolveLatestMessageSendAttemptErrorMessage([attempt])).toBe('Legacy serialized failure');
        expect(formatMessageSendAttemptLog(attempt)).toContain('"message": "Legacy serialized failure"');
    });
});
