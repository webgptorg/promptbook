import type { ToolCall } from '@promptbook-local/types';

/**
 * Builds a stable marker for one tool call so it is handled at most once.
 *
 * @private function of AgentChatWrapper
 */
export function createToolCallMarker(toolCall: ToolCall): string {
    const resultMarker = typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result ?? null);
    return `${toolCall.name}|${toolCall.createdAt || ''}|${resultMarker}`;
}
