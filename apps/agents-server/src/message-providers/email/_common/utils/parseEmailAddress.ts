import type { string_email } from '@promptbook-local/types';
import { isValidEmail, spaceTrim } from '@promptbook-local/utils';
import { EmailAddress } from '../Email';

/**
 * Parses the email address into its components
 */
export function parseEmailAddress(value: string_email): EmailAddress {
    if (value.includes(',')) {
        throw new Error('Seems like you are trying to parse multiple email addresses, use parseEmailAddresses instead');
    }

    let fullName = value.match(/^(?:"?([^"]+)"?|[^<]+)\s*</)?.[1] ?? null;

    if (fullName !== null) {
        fullName = fullName.trim();
    }

    const fullEmail = value.match(/<([^>]+)>/)?.[1] ?? value;
    const plus: Array<string> = [];

    if (!isValidEmail(fullEmail)) {
        throw new Error(
            spaceTrim(
                (block) => `
                    Invalid email address "${fullEmail}"

                    Parsed:
                    ${block(JSON.stringify({ fullName, fullEmail, plus }, null, 4))}
                
                `,
            ),
        );
    }

    if (fullEmail.includes('+')) {
        const [user, domain] = fullEmail.split('@');

        if (!user || !domain) {
            throw new Error('Can not parse email address');
            //               <- TODO: ShouldNeverHappenError
        }

        const userParts = user.split('+');
        userParts.shift();

        plus.push(...userParts);
    }

    let baseEmail = fullEmail;

    for (const plusItem of plus) {
        baseEmail = baseEmail.replace(`+${plusItem}`, '');
    }

    return {
        fullName,
        baseEmail,
        fullEmail,
        plus,
    };
}
