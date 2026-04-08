import type { Json } from '@/src/database/schema';
import { $randomBase58 } from '../../../../../../src/utils/random/$randomBase58';
import type { CreateUserChatTimeoutOptions, UserChatTimeoutInsert, UserChatTimeoutRecord, UserChatTimeoutRow } from '../UserChatTimeoutRecord';
import { isMissingUserChatTimeoutRelationError } from './isMissingUserChatTimeoutRelationError';
import { mapUserChatTimeoutRow } from './mapUserChatTimeoutRow';
import { normalizeRecurrenceIntervalMs } from './normalizeRecurrenceIntervalMs';
import { provideUserChatTimeoutTable } from './provideUserChatTimeoutTable';

/**
 * Prefix used for generated timeout identifiers.
 *
 * @private function of createUserChatTimeout
 */
const USER_CHAT_TIMEOUT_ID_PREFIX = 'tmo_';

/**
 * Length of generated timeout id suffixes.
 *
 * @private function of createUserChatTimeout
 */
const GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH = 14;

/**
 * Human-readable fallback used when timeout persistence is unavailable because
 * the database migration has not been applied yet.
 *
 * @private function of createUserChatTimeout
 */
const USER_CHAT_TIMEOUT_TABLE_UNAVAILABLE_MESSAGE =
    'User chat timeouts are unavailable until the `UserChatTimeout` database migration is applied.';

/**
 * Creates one durable queued timeout for a chat thread.
 *
 * @private function of userChatTimeoutStore
 */
export async function createUserChatTimeout(options: CreateUserChatTimeoutOptions): Promise<UserChatTimeoutRecord> {
    const nowIso = new Date().toISOString();
    const timeoutId =
        options.id || `${USER_CHAT_TIMEOUT_ID_PREFIX}${$randomBase58(GENERATED_USER_CHAT_TIMEOUT_ID_LENGTH)}`;
    const dueAt = options.dueAt || new Date(Date.now() + options.durationMs).toISOString();
    const recurrenceIntervalMs = normalizeRecurrenceIntervalMs(options.recurrenceIntervalMs);
    const userChatTimeoutTable = await provideUserChatTimeoutTable();
    const insertPayload: UserChatTimeoutInsert = {
        id: timeoutId,
        createdAt: nowIso,
        updatedAt: nowIso,
        chatId: options.chatId,
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        status: 'QUEUED',
        message: options.message || null,
        parameters: (options.parameters || {}) satisfies Record<string, unknown> as Json,
        durationMs: options.durationMs,
        dueAt,
        recurrenceIntervalMs,
        queuedAt: nowIso,
        pausedAt: null,
        attemptCount: 0,
        runCount: 0,
        lastFiredAt: null,
    };

    const { data, error } = await userChatTimeoutTable.insert(insertPayload).select('*').maybeSingle();

    if (error) {
        if (isMissingUserChatTimeoutRelationError(error)) {
            throw new Error(USER_CHAT_TIMEOUT_TABLE_UNAVAILABLE_MESSAGE);
        }

        throw new Error(`Failed to create user chat timeout for chat "${options.chatId}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to insert user chat timeout for chat "${options.chatId}".`);
    }

    return mapUserChatTimeoutRow(data as UserChatTimeoutRow);
}
