import type { UserChatTimeoutStatus } from '../UserChatTimeoutRecord';

/**
 * Returns `true` when the timeout already reached a terminal lifecycle state.
 *
 * @private function of userChatTimeoutStore
 */
export function isTerminalUserChatTimeoutStatus(status: UserChatTimeoutStatus): boolean {
    return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}
