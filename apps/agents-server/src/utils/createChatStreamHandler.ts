import type { ChatPromptResult } from '@promptbook-local/types';

type ToolCalls = NonNullable<ChatPromptResult['toolCalls']>;

type ChatStreamHandlerOptions = {
    onDelta: (delta: string) => void;
    onToolCalls?: (toolCalls: ToolCalls) => void;
};

export function createChatStreamHandler(options: ChatStreamHandlerOptions) {
    let previousContent = '';

    return (chunk: ChatPromptResult) => {
        if (chunk.toolCalls && chunk.toolCalls.length > 0) {
            options.onToolCalls?.(chunk.toolCalls);
        }

        const fullContent = chunk.content ?? '';
        const deltaContent = fullContent.substring(previousContent.length);
        previousContent = fullContent;

        if (deltaContent) {
            options.onDelta(deltaContent);
        }
    };
}
