import type { string_emails } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import type { EmailAddress } from '../Email';
import { parseEmailAddress } from './parseEmailAddress';

/**
 * Parses the email addresses into its components
 */
export function parseEmailAddresses(value: string_emails): Array<EmailAddress> {
    const emailAddresses = value
        .split(',')
        .map((email) => spaceTrim(email))
        .filter((email) => email !== '')
        .map((email) => parseEmailAddress(email));

    // console.log('parseEmailAddresses', value, '->', emailAddresses);

    return emailAddresses;
}
