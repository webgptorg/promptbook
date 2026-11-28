import type { UserChatTimeoutRecord } from '../UserChatTimeoutRecord';
import { updateUserChatTimeoutTerminalState } from './updateUserChatTimeoutTerminalState';

/**
 * Marks one timeout as failed with a stored reason.
 *
 * @private function of userChatTimeoutStore
 */
export async function markUserChatTimeoutFailed(
    timeoutId: string,
    failureReason: string,
): Promise<UserChatTimeoutRecord | null> {
    return updateUserChatTimeoutTerminalState(timeoutId, 'FAILED', failureReason);
}
