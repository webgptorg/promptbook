import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { AgentsServerDatabase, Json } from '@/src/database/schema';
import type { ChatMessage } from '@promptbook-local/types';
import { $randomBase58 } from '../../../../src/utils/random/$randomBase58';
import { shortenText } from './shortenText';
import { textToPreviewText } from './textToPreviewText';

/**
 * Stored row shape for `UserChat`.
 */
type UserChatRow = AgentsServerDatabase['public']['Tables']['UserChat']['Row'];

/**
 * Insert payload shape for `UserChat`.
 */
type UserChatInsert = AgentsServerDatabase['public']['Tables']['UserChat']['Insert'];

/**
 * User chat aggregate stored per user and per agent.
 */
export type UserChatRecord = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    userId: number;
    agentPermanentId: string;
    messages: Array<ChatMessage>;
};

/**
 * Lightweight item used by chat history lists.
 */
export type UserChatSummary = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    messagesCount: number;
    title: string;
    preview: string;
};

/**
 * Query options for listing chats.
 */
export type ListUserChatsOptions = {
    userId: number;
    agentPermanentId: string;
};

/**
 * Query options for loading a single chat.
 */
export type GetUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
};

/**
 * Create options for a chat.
 */
export type CreateUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    chatId?: string;
    messages?: ReadonlyArray<ChatMessage>;
};

/**
 * Update options for replacing persisted chat messages.
 */
export type UpdateUserChatMessagesOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
    messages: ReadonlyArray<ChatMessage>;
};

/**
 * Delete options for a chat.
 */
export type DeleteUserChatOptions = {
    userId: number;
    agentPermanentId: string;
    chatId: string;
};

/**
 * Max title length in chat list.
 */
const CHAT_TITLE_MAX_LENGTH = 64;

/**
 * Max preview length in chat list.
 */
const CHAT_PREVIEW_MAX_LENGTH = 96;

/**
 * Human fallback for untitled chats.
 */
const DEFAULT_CHAT_TITLE = 'New chat';

/**
 * Lists all user chats for one agent ordered by last activity.
 */
export async function listUserChats(options: ListUserChatsOptions): Promise<Array<UserChatRecord>> {
    const { userId, agentPermanentId } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserChat');

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .order('lastMessageAt', { ascending: false, nullsFirst: false })
        .order('updatedAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user chats: ${error.message}`);
    }

    return ((data || []) as Array<UserChatRow>).map(mapUserChatRow);
}

/**
 * Loads one user chat by id.
 */
export async function getUserChat(options: GetUserChatOptions): Promise<UserChatRecord | null> {
    const { userId, agentPermanentId, chatId } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserChat');

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load user chat "${chatId}": ${error.message}`);
    }

    return data ? mapUserChatRow(data as UserChatRow) : null;
}

/**
 * Creates one user chat and returns it.
 */
export async function createUserChat(options: CreateUserChatOptions): Promise<UserChatRecord> {
    const { userId, agentPermanentId } = options;
    const messages = normalizeMessagesInput(options.messages || []);
    const now = new Date().toISOString();
    const tableName = await $getTableName('UserChat');
    const supabase = $provideSupabaseForServer();

    for (let attempt = 0; attempt < 3; attempt++) {
        const chatId = normalizeChatId(options.chatId) || $randomBase58(14);
        const insertPayload: UserChatInsert = {
            id: chatId,
            userId,
            agentPermanentId,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: resolveLastMessageAt(messages, now),
            messages: messages as unknown as Json,
        };

        const { data, error } = await supabase.from(tableName).insert(insertPayload).select('*').maybeSingle();

        if (!error && data) {
            return mapUserChatRow(data as UserChatRow);
        }

        if (!error) {
            throw new Error('Failed to create user chat.');
        }

        if (error.code === '23505') {
            continue;
        }

        throw new Error(`Failed to create user chat: ${error.message}`);
    }

    throw new Error('Failed to create user chat id after multiple attempts.');
}

/**
 * Replaces stored chat messages and updates activity timestamps.
 */
export async function updateUserChatMessages(options: UpdateUserChatMessagesOptions): Promise<UserChatRecord> {
    const { userId, agentPermanentId, chatId } = options;
    const messages = normalizeMessagesInput(options.messages);
    const now = new Date().toISOString();
    const tableName = await $getTableName('UserChat');
    const supabase = $provideSupabaseForServer();

    const { data, error } = await supabase
        .from(tableName)
        .update({
            updatedAt: now,
            lastMessageAt: resolveLastMessageAt(messages, now),
            messages: messages as unknown as Json,
        })
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to update user chat "${chatId}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`User chat "${chatId}" was not found.`);
    }

    return mapUserChatRow(data as UserChatRow);
}

/**
 * Deletes one user chat owned by the user.
 */
export async function deleteUserChat(options: DeleteUserChatOptions): Promise<boolean> {
    const { userId, agentPermanentId, chatId } = options;
    const tableName = await $getTableName('UserChat');
    const supabase = $provideSupabaseForServer();

    const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', chatId)
        .eq('userId', userId)
        .eq('agentPermanentId', agentPermanentId)
        .select('id')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to delete user chat "${chatId}": ${error.message}`);
    }

    return Boolean(data);
}

/**
 * Builds chat list metadata from a full record.
 */
export function createUserChatSummary(chat: UserChatRecord): UserChatSummary {
    const firstUserMessage = chat.messages.find((message) => isUserMessageSender(message.sender));
    const lastMessage = [...chat.messages].reverse().find((message) => textToPreviewText(message.content).length > 0);
    const titleSource = textToPreviewText(firstUserMessage?.content || '');
    const previewSource = textToPreviewText(lastMessage?.content || '');

    return {
        id: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt,
        messagesCount: chat.messages.length,
        title: shortenText(titleSource || DEFAULT_CHAT_TITLE, CHAT_TITLE_MAX_LENGTH),
        preview: shortenText(previewSource, CHAT_PREVIEW_MAX_LENGTH),
    };
}

/**
 * Maps raw database row into a typed chat record.
 */
function mapUserChatRow(row: UserChatRow): UserChatRecord {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastMessageAt: row.lastMessageAt,
        userId: row.userId,
        agentPermanentId: row.agentPermanentId,
        messages: normalizeStoredMessages(row.messages),
    };
}

/**
 * Safely parses persisted messages from JSONB.
 */
function normalizeStoredMessages(rawMessages: Json): Array<ChatMessage> {
    if (!Array.isArray(rawMessages)) {
        return [];
    }

    return rawMessages as unknown as Array<ChatMessage>;
}

/**
 * Normalizes incoming chat messages to a mutable array.
 */
function normalizeMessagesInput(messages: ReadonlyArray<ChatMessage>): Array<ChatMessage> {
    return [...messages];
}

/**
 * Resolves `lastMessageAt` from messages list.
 */
function resolveLastMessageAt(messages: ReadonlyArray<ChatMessage>, fallbackTimestamp: string): string | null {
    if (messages.length === 0) {
        return null;
    }

    const lastCreatedAt = [...messages]
        .reverse()
        .map((message) => (typeof message.createdAt === 'string' ? message.createdAt : null))
        .find((createdAt) => Boolean(createdAt));

    return (typeof lastCreatedAt === 'string' ? lastCreatedAt : null) || fallbackTimestamp;
}

/**
 * Checks whether sender id represents a user-authored message.
 */
function isUserMessageSender(sender: unknown): boolean {
    if (typeof sender !== 'string') {
        return false;
    }

    return sender.toUpperCase() === 'USER';
}

/**
 * Normalizes an optional chat id input.
 */
function normalizeChatId(rawChatId: string | undefined): string | undefined {
    if (!rawChatId) {
        return undefined;
    }

    const normalized = rawChatId.trim();
    return normalized.length > 0 ? normalized : undefined;
}
