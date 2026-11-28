import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { ParseError } from '../../../../../../../src/errors/ParseError';
import {
    assertEmailTestingSenderDomainAllowed,
    createEmailTestingOutboundEmail,
    type EmailTestingFormValues,
} from './emailTesting';

/**
 * Valid form values reused by email testing validation tests.
 */
const VALID_EMAIL_TESTING_FORM_VALUES: EmailTestingFormValues = {
    from: 'Testing Agent <agent@server.example.com>',
    to: 'First Recipient <first@example.com>, second@example.com',
    subject: 'Testing subject',
    body: 'Testing body',
};

describe('emailTesting', () => {
    it('creates a transport-ready email from arbitrary sender and recipient addresses', () => {
        const email = createEmailTestingOutboundEmail(VALID_EMAIL_TESTING_FORM_VALUES);

        expect(email).toEqual(
            expect.objectContaining({
                channel: 'EMAIL',
                direction: 'OUTBOUND',
                sender: '"Testing Agent" <agent@server.example.com>',
                recipients: ['"First Recipient" <first@example.com>', 'second@example.com'],
                subject: 'Testing subject',
                content: 'Testing body',
            }),
        );
        expect(email.threadId).toEqual(expect.any(String));
    });

    it('returns a branded error for invalid recipient input', () => {
        expect(() =>
            createEmailTestingOutboundEmail({
                ...VALID_EMAIL_TESTING_FORM_VALUES,
                to: 'not an email address',
            }),
        ).toThrow(ParseError);
    });

    it('allows a normal admin to send from the current server domain', () => {
        expect(() =>
            assertEmailTestingSenderDomainAllowed({
                sender: 'Testing Agent <agent@SERVER.EXAMPLE.COM>',
                currentServerDomain: 'server.example.com',
                isGlobalAdmin: false,
            }),
        ).not.toThrow();
    });

    it('rejects a normal admin sender outside the current server domain', () => {
        expect(() =>
            assertEmailTestingSenderDomainAllowed({
                sender: 'agent@other.example.com',
                currentServerDomain: 'server.example.com',
                isGlobalAdmin: false,
            }),
        ).toThrow(NotAllowed);
    });

    it('allows the superadmin to send from another domain', () => {
        expect(() =>
            assertEmailTestingSenderDomainAllowed({
                sender: 'agent@other.example.com',
                currentServerDomain: 'server.example.com',
                isGlobalAdmin: true,
            }),
        ).not.toThrow();
    });
});
