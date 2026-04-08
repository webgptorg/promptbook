import type { Json } from '@/src/database/schema';
import type { UserChatTimeoutParameters } from '../UserChatTimeoutRecord';

/**
 * Normalizes persisted JSONB parameters for timeout execution.
 *
 * @private function of userChatTimeoutStore
 */
export function normalizeUserChatTimeoutParameters(rawParameters: Json): UserChatTimeoutParameters {
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
        return {};
    }

    return rawParameters as UserChatTimeoutParameters;
}
