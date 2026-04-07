import type { ServerTranslationVariables } from '../../languages/ServerLanguagePack';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';

/**
 * Translation helper shared across extracted wizard modules.
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type NewAgentWizardTranslate = (
    key: ServerTranslationKey,
    variables?: ServerTranslationVariables,
) => string;
