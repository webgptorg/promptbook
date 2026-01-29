import type { LlmToolDefinition } from '../../../types/LlmToolDefinition';
import type { TODO_any } from '../../../utils/organization/TODO_any';

/**
 * Maps Promptbook tools to OpenAI Responses API tool definitions.
 *
 * @private
 */
export function mapToolsToOpenAiResponses(tools: ReadonlyArray<LlmToolDefinition>): Array<TODO_any> {
    return tools.map((tool) => ({
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
    }));
}
