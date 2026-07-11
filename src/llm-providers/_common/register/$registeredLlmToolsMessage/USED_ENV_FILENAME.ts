import { spaceTrim } from 'spacetrim';
import type { string_filename } from '../../../../types/string_filename';
import type { $side_effect } from '../../../../utils/organization/$side_effect';

/**
 * Path to the `.env` file which was used to configure LLM tools
 *
 * Note: `$` is used to indicate that this variable is changed by side effect in `$provideLlmToolsConfigurationFromEnv` through `$setUsedEnvFilename`
 */
let $usedEnvFilename: string | null = null;

/**
 * Shared state for the `.env` file used to configure LLM tools.
 *
 * @private internal state of `$registeredLlmToolsMessage`
 */
export const USED_ENV_FILENAME = {
    set(filepath: string_filename): $side_effect {
        $usedEnvFilename = filepath;
    },

    createMessage(): string {
        return $usedEnvFilename === null
            ? `Unknown \`.env\` file`
            : spaceTrim(`
                  Used \`.env\` file:
                  ${$usedEnvFilename}
              `);
    },
};
