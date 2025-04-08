import type { string_promptbook_token } from '../../../types/typeAliases';
import type { really_unknown } from '../../../utils/organization/really_unknown';
import type { ApplicationModeIdentification } from './Identification';

/**
 * Convert identification to Promptbook token
 *
 * @param identification
 *
 * @public exported from `@promptbook/core`
 */
export function identificationToPromptbookToken(
    identification: ApplicationModeIdentification<really_unknown>,
): string_promptbook_token {
    const { appId, userId, userToken } = identification;
    const promptbookToken = `${appId}-${userId}-${userToken}`;
    return promptbookToken;
}
