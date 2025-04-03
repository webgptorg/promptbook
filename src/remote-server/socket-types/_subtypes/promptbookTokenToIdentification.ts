import { string_promptbook_token } from '../../../types/typeAliases';
import { really_unknown } from '../../../utils/organization/really_unknown';
import { ApplicationModeIdentification } from './Identification';

/**
 * Convert Promptbook token to identification
 *
 * @param promptbookToken
 *
 * @public exported from `@promptbook/core`
 */
export function promptbookTokenToIdentification(
    promptbookToken: string_promptbook_token,
): ApplicationModeIdentification<undefined> {
    const [appId, userId, userToken] = promptbookToken.split('-');

    if (!appId || !userId || !userToken) {
        throw new Error(`Invalid promptbook token: ${promptbookToken}`);
    }

    const identification: ApplicationModeIdentification<undefined> = {
        appId,
        userId,
        userToken,
        isAnonymous: false,
    };
    return identification;
}

