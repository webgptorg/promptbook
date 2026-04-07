import type { ChatMessage } from '@promptbook-local/components';
import type { ToolCall } from '@promptbook-local/types';

/**
 * Finds the newest tool call matching the supplied predicate.
 *
 * @private function of useAgentChatToolInteractions
 */
export function findNewestMatchingToolCall(
    messages: ReadonlyArray<ChatMessage>,
    predicate: (toolCall: ToolCall) => boolean,
): ToolCall | null {
    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index];
        if (!message) {
            continue;
        }

        const toolCalls = message.toolCalls || message.completedToolCalls;
        if (!toolCalls || toolCalls.length === 0) {
            continue;
        }

        for (const toolCall of toolCalls) {
            if (predicate(toolCall)) {
                return toolCall;
            }
        }
    }

    return null;
}
