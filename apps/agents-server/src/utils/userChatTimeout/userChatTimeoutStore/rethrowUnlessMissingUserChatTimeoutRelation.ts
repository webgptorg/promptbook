import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';

/**
 * Throws the original error unless it represents a missing timeout table.
 *
 * @private function of userChatTimeoutStore
 */
export function rethrowUnlessMissingUserChatTimeoutRelation(error: unknown): void {
    if (isMissingUserChatTimeoutRelationError(error)) {
        return;
    }

    throw error;
}
