import type { string_emails } from '../../typeAliases';
import type { EmailAddress } from '../Email';
import { stringifyEmailAddress } from './stringifyEmailAddress';

/**
 * Makes string email from multiple EmailAddress
 */
export function stringifyEmailAddresses(emailAddresses: Array<EmailAddress>): string_emails {
    return emailAddresses.map((emailAddress) => stringifyEmailAddress(emailAddress)).join(', ');
}

/**
 * TODO: [🎾] Implement and test here escaping
 */
