import type { ToolCall } from '../../../types/ToolCall';
import { getToolCallIdentity } from '../../../utils/toolCalls/getToolCallIdentity';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Resolves the latest known snapshot of one tool call from rendered chat messages.
 *
 * @param messages - Chat messages currently rendered in the UI.
 * @param toolCallIdentity - Stable tool-call identity.
 * @param fallbackToolCall - Optional fallback snapshot used before live state is found.
 * @returns Latest matching tool call or the fallback snapshot.
 *
 * @private internal helper for chat tool-call modal state
 */
export function resolveToolCallFromChatMessages(
    messages: ReadonlyArray<ChatMessage>,
    toolCallIdentity: string | null,
    fallbackToolCall: ToolCall | null,
): ToolCall | null {
    if (!toolCallIdentity) {
        return fallbackToolCall;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index]!;
        const candidateToolCalls = [
            ...(message.toolCalls || []),
            ...(message.completedToolCalls || []),
            ...(message.ongoingToolCalls || []),
        ];

        for (const candidateToolCall of candidateToolCalls) {
            if (getToolCallIdentity(candidateToolCall) === toolCallIdentity) {
                return candidateToolCall;
            }
        }
    }

    return fallbackToolCall;
}
