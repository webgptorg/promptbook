import type { ChatMessage } from '@promptbook-local/types';

/**
 * Returns `true` when the current transcript still suggests unfinished assistant work.
 *
 * This is intentionally message-based so readers can avoid heavier reconciliation work for
 * settled chats while still inspecting threads that contain incomplete placeholders.
 *
 * @param messages - Current persisted chat transcript.
 * @returns Whether the transcript still looks unfinished from the UI perspective.
 * @private internal utility of `userChat`
 */
export function hasPotentiallyPendingAssistantMessages(messages: ReadonlyArray<ChatMessage>): boolean {
    return messages.some((message) => {
        const sender = String(message.sender || '').toUpperCase();
        if (sender !== 'AGENT' && sender !== 'MODEL') {
            return false;
        }

        return (
            message.isComplete === false ||
            message.lifecycleState === 'queued' ||
            message.lifecycleState === 'running'
        );
    });
}
