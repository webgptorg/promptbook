import type { ChatMessage } from '@promptbook-local/types';

/**
 * Normalizes incoming chat messages to a mutable array.
 *
 * @private function of `userChat`
 */
export function normalizeMessagesInput(messages: ReadonlyArray<ChatMessage>): Array<ChatMessage> {
    return [...messages];
}

/**
 * Resolves `lastMessageAt` from messages list.
 *
 * @private function of `userChat`
 */
export function resolveLastMessageAt(messages: ReadonlyArray<ChatMessage>, fallbackTimestamp: string): string | null {
    if (messages.length === 0) {
        return null;
    }

    const lastCreatedAt = [...messages]
        .reverse()
        .map((message) => (typeof message.createdAt === 'string' ? message.createdAt : null))
        .find((createdAt) => Boolean(createdAt));

    return (typeof lastCreatedAt === 'string' ? lastCreatedAt : null) || fallbackTimestamp;
}
