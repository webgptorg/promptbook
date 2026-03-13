import { Json } from '@/src/database/schema';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import type { CreateUserChatOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatInsert, UserChatRow } from './UserChatRow';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { normalizeMessagesInput, resolveLastMessageAt } from './resolveLastMessageAt';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * Maximum retries for chat-id collision recovery.
 *
 * @private function of `userChat`
 */
const CREATE_USER_CHAT_MAX_ATTEMPTS = 3;

/**
 * Length of generated random chat id.
 *
 * @private function of `userChat`
 */
const GENERATED_CHAT_ID_LENGTH = 14;

/**
 * PostgreSQL duplicate key violation code.
 *
 * @private function of `userChat`
 */
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

/**
 * Creates one user chat and returns it.
 */
export async function createUserChat(options: CreateUserChatOptions): Promise<UserChatRecord> {
    const { userId, agentPermanentId } = options;
    const messages = normalizeMessagesInput(options.messages || []);
    const now = new Date().toISOString();
    const normalizedChatId = normalizeChatId(options.chatId);
    const source = options.source || USER_CHAT_SOURCES.WEB_UI;

    for (let attempt = 0; attempt < CREATE_USER_CHAT_MAX_ATTEMPTS; attempt++) {
        const userChatTable = await provideUserChatTable();
        const chatId = normalizedChatId || $randomBase58(GENERATED_CHAT_ID_LENGTH);
        const insertPayload: UserChatInsert = {
            id: chatId,
            userId,
            agentPermanentId,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: resolveLastMessageAt(messages, now),
            source,
            messages: messages as unknown as Json,
        };

        const { data, error } = await userChatTable.insert(insertPayload).select('*').maybeSingle();

        if (!error && data) {
            return mapUserChatRow(data as UserChatRow);
        }

        if (!error) {
            throw new Error('Failed to create user chat.');
        }

        if (error.code === POSTGRES_UNIQUE_VIOLATION_CODE) {
            continue;
        }

        throw new Error(`Failed to create user chat: ${error.message}`);
    }

    throw new Error('Failed to create user chat id after multiple attempts.');
}

/**
 * Normalizes an optional chat id input.
 *
 * @private function of `createUserChat`
 */
function normalizeChatId(rawChatId: string | undefined): string | undefined {
    if (!rawChatId) {
        return undefined;
    }

    const normalized = rawChatId.trim();
    return normalized.length > 0 ? normalized : undefined;
}
