import type OpenAI from 'openai';
import type { LlmToolDefinition } from '../../../types/LlmToolDefinition';

/**
 * Maps Promptbook tools to OpenAI tools.
 *
 * @private
 */
export function mapToolsToOpenAi(
    tools: ReadonlyArray<LlmToolDefinition>,
): Array<OpenAI.Chat.Completions.ChatCompletionTool & OpenAI.Beta.AssistantTool> {
    return tools.map((tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as Record<string, unknown>,
        },
    })) as Array<OpenAI.Chat.Completions.ChatCompletionTool & OpenAI.Beta.AssistantTool>;
}
