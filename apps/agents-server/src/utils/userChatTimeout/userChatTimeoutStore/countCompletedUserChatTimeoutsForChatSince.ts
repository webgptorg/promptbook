import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Counts completed timeout firings for one chat thread since the provided timestamp.
 *
 * @private function of userChatTimeoutStore
 */
export async function countCompletedUserChatTimeoutsForChatSince(chatId: string, sinceIso: string): Promise<number> {
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const { count, error } = await userChatTimeoutTable
        .select('*', { count: 'exact', head: true })
        .eq('chatId', chatId)
        .eq('status', 'COMPLETED')
        .gte('completedAt', sinceIso);

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            return 0;
        }

        throw new Error(`Failed to count completed user chat timeouts for chat "${chatId}": ${error.message}`);
    }

    return count || 0;
}
