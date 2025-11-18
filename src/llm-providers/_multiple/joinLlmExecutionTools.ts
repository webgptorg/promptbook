import spaceTrim from 'spacetrim';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_markdown_text, string_title } from '../../types/typeAliases';
import { MultipleLlmExecutionTools } from './MultipleLlmExecutionTools';

/**
 * Joins multiple LLM Execution Tools into one
 *
 * @returns {LlmExecutionTools} Single wrapper for multiple LlmExecutionTools
 *
 * 0) If there is no LlmExecutionTools, it warns and returns valid but empty LlmExecutionTools
 * 1) If there is only one LlmExecutionTools, it returns it wrapped in a proxy object
 * 2) If there are multiple LlmExecutionTools, first will be used first, second will be used if the first hasn`t defined model variant or fails, etc.
 * 3) When all LlmExecutionTools fail, it throws an error with a list of all errors merged into one
 *
 *
 * Tip: You don't have to use this function directly, just pass an array of LlmExecutionTools to the `ExecutionTools`
 *
 * @public exported from `@promptbook/core`
 */
export function joinLlmExecutionTools(
    title: string_title & string_markdown_text,
    ...llmExecutionTools: ReadonlyArray<LlmExecutionTools>
): MultipleLlmExecutionTools {
    if (llmExecutionTools.length === 0) {
        const warningMessage = spaceTrim(`
            You have not provided any \`LlmExecutionTools\`
            This means that you won't be able to execute any prompts that require large language models like GPT-4 or Anthropic's Claude.

            Technically, it's not an error, but it's probably not what you want because it does not make sense to use Promptbook without language models.
        `);

        // TODO: [🟥] Detect browser / node and make it colorful
        console.warn(warningMessage);
        // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks

        /*
        return {
            async listModels() {
                // TODO: [🟥] Detect browser / node and make it colorful
                console.warn(
                    spaceTrim(
                        (block) => `

                            You can't list models because you have no LLM Execution Tools defined:

                            tl;dr

                            ${block(warningMessage)}
                        `,
                    ),
                );
                return [];
            },
        };
        */
    }

    return new MultipleLlmExecutionTools(
        title || 'Multiple LLM Providers joined by `joinLlmExecutionTools`',
        ...llmExecutionTools,
    );
}

/**
 * TODO: [🙆] `getSingleLlmExecutionTools` vs `joinLlmExecutionTools` - explain difference or pick one
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
