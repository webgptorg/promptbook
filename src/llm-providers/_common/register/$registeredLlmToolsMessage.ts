import type { string_filename } from '../../../types/string_filename';
import type { string_markdown } from '../../../types/string_markdown';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { USED_ENV_FILENAME } from './$registeredLlmToolsMessage/USED_ENV_FILENAME';
import { createRegisteredLlmToolsMessageContext } from './$registeredLlmToolsMessage/createRegisteredLlmToolsMessageContext';
import { renderNoRegisteredLlmToolsMessage } from './$registeredLlmToolsMessage/renderNoRegisteredLlmToolsMessage';
import { renderRegisteredLlmToolsMessage } from './$registeredLlmToolsMessage/renderRegisteredLlmToolsMessage';

/**
 * Pass the `.env` file which was used to configure LLM tools
 *
 * Note: `$` is used to indicate that this variable is making side effect
 *
 * @private internal log of `$provideLlmToolsConfigurationFromEnv` and `$registeredLlmToolsMessage`
 */
export function $setUsedEnvFilename(filepath: string_filename): $side_effect {
    USED_ENV_FILENAME.set(filepath);
}

/**
 * Creates a message with all registered LLM tools
 *
 * Note: This function is used to create a (error) message when there is no constructor for some LLM provider
 *
 * @private internal function of `createLlmToolsFromConfiguration` and `$provideLlmToolsFromEnv`
 */
export function $registeredLlmToolsMessage(): string_markdown {
    const registeredLlmToolsMessageContext = createRegisteredLlmToolsMessageContext();

    if (registeredLlmToolsMessageContext.llmToolStatuses.length === 0) {
        return renderNoRegisteredLlmToolsMessage(registeredLlmToolsMessageContext.usedEnvMessage);
    }

    return renderRegisteredLlmToolsMessage(registeredLlmToolsMessageContext);
}

// TODO: [®] DRY Register logic
// TODO: [🧠][⚛] Maybe pass env as argument
