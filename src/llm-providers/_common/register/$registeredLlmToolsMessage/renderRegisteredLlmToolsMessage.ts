import { spaceTrim } from 'spacetrim';
import type { string_markdown } from '../../../../types/string_markdown';
import { renderAvailableRegisteredLlmTools } from './renderAvailableRegisteredLlmTools';
import { renderRelevantRegisteredLlmToolsEnvironmentVariables } from './renderRelevantRegisteredLlmToolsEnvironmentVariables';
import type { RegisteredLlmToolsMessageContext } from './RegisteredLlmToolsMessageContext';

/**
 * Renders the full provider status summary.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function renderRegisteredLlmToolsMessage({
    env,
    llmToolStatuses,
    usedEnvMessage,
    isRunningInNode,
}: RegisteredLlmToolsMessageContext): string_markdown {
    return spaceTrim(
        (block) => `

            ${block(usedEnvMessage)}

            Relevant environment variables:
            ${block(renderRelevantRegisteredLlmToolsEnvironmentVariables(env, llmToolStatuses))}

            Available LLM providers are:
            ${block(renderAvailableRegisteredLlmTools(llmToolStatuses, env, isRunningInNode))}
        `,
    );
}
