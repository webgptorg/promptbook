import type { ChatPromptResult } from '../../../../src/execution/PromptResult';

/**
 * Tool-call list emitted by one streamed `ChatPromptResult` chunk.
 */
type ToolCalls = NonNullable<ChatPromptResult['toolCalls']>;

/**
 * Callback hooks used by the chat stream delta extractor.
 */
type ChatStreamHandlerOptions = {
    /**
     * Receives plain-text delta extracted from cumulative `chunk.content`.
     */
    onDelta: (delta: string) => void;
    /**
     * Receives tool-call snapshots carried by streamed chunks.
     */
    onToolCalls?: (toolCalls: ToolCalls) => void;
};

/**
 * Creates a stateful chunk handler that converts cumulative chat content into deltas.
 *
 * Tool calls are forwarded as they arrive so the UI can render ongoing chips while streaming.
 */
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
