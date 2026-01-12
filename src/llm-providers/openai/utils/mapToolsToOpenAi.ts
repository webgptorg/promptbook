import type OpenAI from 'openai';
import type { LlmToolDefinition } from '../../../types/LlmToolDefinition';

/**
 * Maps Promptbook tools to OpenAI tools.
 *
 * @private
 */
export function mapToolsToOpenAi(
    tools: ReadonlyArray<LlmToolDefinition>,
): Array<OpenAI.Chat.Completions.ChatCompletionTool> {
    return tools.map(
        (tool): OpenAI.Chat.Completions.ChatCompletionTool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters as Record<string, unknown>,
            },
        }),
    );
}
