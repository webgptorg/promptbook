import { spaceTrim } from 'spacetrim';
import type { string_markdown } from '../../../../types/string_markdown';

/**
 * Renders the fallback message for environments with no registered providers.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function renderNoRegisteredLlmToolsMessage(usedEnvMessage: string): string_markdown {
    return spaceTrim(
        (block) => `
            No LLM providers are available.

            ${block(usedEnvMessage)}
      `,
    );
}
