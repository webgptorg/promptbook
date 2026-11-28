import { Json } from '@/src/database/schema';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import type { CreateUserChatJobOptions, UserChatJobRecord } from './UserChatJobRecord';
import type { UserChatJobInsert, UserChatJobRow } from './UserChatJobRow';
import { mapUserChatJobRow } from './mapUserChatJobRow';
import { provideUserChatJobTable } from './provideUserChatJobTable';

/**
 * Length of generated durable chat-job ids.
 *
 * @private function of `userChat`
 */
const GENERATED_USER_CHAT_JOB_ID_LENGTH = 14;

/**
 * PostgreSQL duplicate key violation code.
 *
 * @private function of `userChat`
 */
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

/**
 * Creates one durable queued job for a chat turn.
 */
export async function createUserChatJob(options: CreateUserChatJobOptions): Promise<UserChatJobRecord> {
    const { userId, agentPermanentId, chatId, userMessageId, assistantMessageId, clientMessageId } = options;
    const now = new Date().toISOString();
    const userChatJobTable = await provideUserChatJobTable();
    const insertPayload: UserChatJobInsert = {
        id: options.id || $randomBase58(GENERATED_USER_CHAT_JOB_ID_LENGTH),
        createdAt: now,
        updatedAt: now,
        chatId,
        userId,
        agentPermanentId,
        userMessageId,
        assistantMessageId,
        clientMessageId,
        status: 'QUEUED',
        parameters: ((options.parameters || {}) satisfies Record<string, unknown>) as Json,
        queuedAt: now,
        attemptCount: 0,
    };

    const { data, error } = await userChatJobTable.insert(insertPayload).select('*').maybeSingle();

    if (error) {
        if (error.code === POSTGRES_UNIQUE_VIOLATION_CODE) {
            const duplicateError = new Error(
                `User chat job already exists for client message "${clientMessageId}" in chat "${chatId}".`,
            );
            duplicateError.name = 'UserChatJobDuplicateError';
            throw duplicateError;
        }

        throw new Error(`Failed to create user chat job for chat "${chatId}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to insert user chat job for chat "${chatId}".`);
    }

    return mapUserChatJobRow(data as UserChatJobRow);
}
