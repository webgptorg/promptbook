import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_model_name } from '../../types/string_model_name';
import type { string_prompt } from '../../types/string_prompt';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../types/ToolCall';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';

/**
 * Emits a progress update to signal assistant preparation before long setup work.
 *
 * @private internal utility of `AgentLlmExecutionTools`
 */
export function emitAgentLlmExecutionToolsAssistantPreparationProgress(options: {
    /**
     * Callback to send progress updates to the caller.
     */
    readonly onProgress: (chunk: ChatPromptResult) => void;

    /**
     * Original prompt being executed.
     */
    readonly prompt: Prompt;

    /**
     * Model name used for the update payload.
     */
    readonly modelName: string_model_name;

    /**
     * Optional detail describing the current preparation phase.
     */
    readonly phase?: string;
}): void {
    const startedAt = $getCurrentDate();

    options.onProgress({
        content: '',
        modelName: options.modelName,
        timing: {
            start: startedAt,
            complete: startedAt,
        },
        usage: UNCERTAIN_USAGE,
        rawPromptContent: options.prompt.content as string_prompt,
        rawRequest: null,
        rawResponse: {
            status: 'assistant_preparation',
        },
        toolCalls: [
            {
                name: ASSISTANT_PREPARATION_TOOL_CALL_NAME,
                arguments: options.phase ? { phase: options.phase } : {},
                createdAt: startedAt,
            },
        ],
    });
}
