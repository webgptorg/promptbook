import type { ChatMessage, ChatPrompt, ChatPromptResult, LlmToolDefinition, ToolCall } from '@promptbook-local/types';

/**
 * Input for building the raw-inspection prompt snapshot stored on one chat message.
 */
export type CreateUserChatMessagePromptOptions = {
    prompt: Pick<ChatPrompt, 'title' | 'content' | 'parameters' | 'modelRequirements' | 'thread' | 'attachments' | 'tools'>;
    availableTools: ReadonlyArray<LlmToolDefinition>;
    toolCalls?: ReadonlyArray<ToolCall>;
    completedToolCalls?: ReadonlyArray<ToolCall>;
    rawPromptContent?: ChatPromptResult['rawPromptContent'];
    rawRequest?: ChatPromptResult['rawRequest'];
};

/**
 * Creates the serializable prompt snapshot used by the raw message inspector.
 */
export function createUserChatMessagePrompt(
    options: CreateUserChatMessagePromptOptions,
): NonNullable<ChatMessage['prompt']> {
    const { prompt, availableTools, toolCalls, completedToolCalls, rawPromptContent, rawRequest } = options;

    return {
        title: prompt.title,
        content: prompt.content,
        parameters: prompt.parameters,
        modelRequirements: prompt.modelRequirements,
        ...(prompt.thread ? { thread: prompt.thread } : {}),
        ...(prompt.attachments ? { attachments: prompt.attachments } : {}),
        ...(prompt.tools ? { tools: prompt.tools } : {}),
        availableTools,
        ...(toolCalls ? { toolCalls } : {}),
        ...(completedToolCalls ? { completedToolCalls } : {}),
        ...(rawPromptContent ? { rawPromptContent } : {}),
        ...(rawRequest !== undefined ? { rawRequest } : {}),
    };
}
