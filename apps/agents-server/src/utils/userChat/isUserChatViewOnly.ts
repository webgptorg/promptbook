import type { UserChatRecord } from './UserChatRecord';
import { isFrozenUserChatSource } from './UserChatSource';

/**
 * Returns true when the chat must stay view-only for the given viewer.
 *
 * A chat is view-only when it was captured from an external channel (frozen source)
 * or when it belongs to a different user (super-admins browsing all users' chats).
 */
export function isUserChatViewOnly(options: {
    chat: Pick<UserChatRecord, 'source' | 'userId'>;
    viewerUserId: number;
}): boolean {
    const { chat, viewerUserId } = options;
    return isFrozenUserChatSource(chat.source) || chat.userId !== viewerUserId;
}
