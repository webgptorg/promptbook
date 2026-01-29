import spaceTrim from 'spacetrim';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_markdown_text, string_title } from '../../types/typeAliases';
import { MultipleLlmExecutionTools } from './MultipleLlmExecutionTools';

/**
 * Joins multiple LLM Execution Tools into one.
 *
 * This function takes a list of `LlmExecutionTools` and returns a single unified
 * `MultipleLlmExecutionTools` object. It provides failover and aggregation logic:
 *
 * 1.  **Failover**: When a model call is made, it tries providers in the order they were provided.
 *     If the first provider doesn't support the requested model or fails, it tries the next one.
 * 2.  **Aggregation**: `listModels` returns a combined list of all models available from all providers.
 * 3.  **Empty case**: If no tools are provided, it logs a warning (as Promptbook requires LLMs to function).
 *
 * @param title - A descriptive title for this collection of joined tools
 * @param llmExecutionTools - An array of execution tools to be joined
 * @returns A single unified execution tool wrapper
 *
 * Tip: You don't have to use this function directly, just pass an array of LlmExecutionTools to the `ExecutionTools`.
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
 * TODO: [👷‍♂️] Write a comprehensive manual about how to construct and use LLM execution tools in Promptbook
 */
