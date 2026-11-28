import type { id } from '../../../types/string_token';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Resolves the stable key used for local chat feedback state.
 *
 * @private utility of `<Chat/>`
 */
export function resolveChatRatingMessageKey(message: Pick<ChatMessage, 'id' | 'content'>): id {
    return message.id || message.content /* <- TODO: [??][??] Is `message.content` good replacement for the ID */;
}
