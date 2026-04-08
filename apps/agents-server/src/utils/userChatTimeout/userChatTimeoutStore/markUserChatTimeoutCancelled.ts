import type { UserChatTimeoutRecord } from '../UserChatTimeoutRecord';
import { updateUserChatTimeoutTerminalState } from './updateUserChatTimeoutTerminalState';

/**
 * Marks one timeout as cancelled with an optional stored reason.
 *
 * @private function of userChatTimeoutStore
 */
export async function markUserChatTimeoutCancelled(
    timeoutId: string,
    failureReason = 'Timeout was cancelled.',
): Promise<UserChatTimeoutRecord | null> {
    return updateUserChatTimeoutTerminalState(timeoutId, 'CANCELLED', failureReason);
}
