import type { ChatMessage } from '@promptbook-local/types';

/**
 * Resolves a key identifying the newest finished agent answer in one chat.
 *
 * A finished agent turn is the only moment when the agent can have created a project, so this key is the
 * signal telling the chat to reload its project references. Messages which are still being generated are
 * ignored on purpose — their content keeps changing while the progress card updates, which says nothing
 * about the projects on the server.
 *
 * @param messages - Messages currently rendered in the chat.
 * @returns Key of the newest finished agent message, or `null` when the agent has answered nothing yet.
 */
export function resolveLatestCompletedAgentMessageKey(messages: ReadonlyArray<ChatMessage> | undefined): string | null {
    if (!messages) {
        return null;
    }

    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
        const message = messages[messageIndex];

        if (message === undefined || message.sender === 'USER' || message.isComplete === false) {
            continue;
        }

        // Note: Messages of chats which do not persist ids are identified by their position, which still
        //       moves forward with every new answer
        return message.id === undefined ? `#${messageIndex}` : String(message.id);
    }

    return null;
}
