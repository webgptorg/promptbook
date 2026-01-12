import type OpenAI from 'openai';
import type { LlmToolDefinition } from '../../../types/LlmToolDefinition';

/**
 * Maps Promptbook tools to OpenAI tools.
 *
 * @private
 */
export function mapToolsToOpenAi(
    tools: ReadonlyArray<LlmToolDefinition>,
): Array<OpenAI.Chat.Completions.ChatCompletionTool>;
export function mapToolsToOpenAi(
    tools: ReadonlyArray<LlmToolDefinition>,
): Array<OpenAI.Beta.AssistantTool>;
export function mapToolsToOpenAi(
    tools: ReadonlyArray<LlmToolDefinition>,
): Array<OpenAI.Chat.Completions.ChatCompletionTool> | Array<OpenAI.Beta.AssistantTool> {
    return tools.map(
        (tool): OpenAI.Chat.Completions.ChatCompletionTool & OpenAI.Beta.AssistantTool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters as Record<string, unknown>,
            },
        }),
    );
}
