import { string_promptbook_token } from '../../../types/typeAliases';
import { really_unknown } from '../../../utils/organization/really_unknown';
import { ApplicationModeIdentification } from './Identification';

/**
 * Convert identification to Promptbook token
 *
 * @param identification
 */
export function identificationToPromptbookToken(
    identification: ApplicationModeIdentification<really_unknown>,
): string_promptbook_token {
    const { appId, userId, userToken } = identification;
    const promptbookToken = `${appId}-${userId}-${userToken}`;
    return promptbookToken;
}
