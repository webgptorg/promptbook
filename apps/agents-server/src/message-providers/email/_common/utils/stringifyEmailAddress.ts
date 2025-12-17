import type { string_email } from '@promptbook-local/types';
import type { EmailAddress } from '../Email';

/**
 * Makes string email from EmailAddress
 */
export function stringifyEmailAddress(emailAddress: EmailAddress): string_email {
    const { fullEmail, fullName } = emailAddress;

    if (fullName !== null) {
        return `"${fullName}" <${fullEmail}>`;
    }

    return fullEmail;
}

/**
 * TODO: [🎾] Implement and test here escaping
 */
