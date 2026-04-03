import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { ListUserChatsOptions, UserChatRecord } from './UserChatRecord';
import type { UserChatSource } from './UserChatSource';
import type { UserChatRow } from './UserChatRow';
import type { UserChatSummarySeed } from './createUserChatSummary';
import { mapUserChatRow } from './mapUserChatRow';
import { provideUserChatTable } from './provideUserChatTable';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * PostgreSQL undefined-table error code.
 *
 * @private function of `userChat`
 */
const POSTGRES_UNDEFINED_TABLE_ERROR_CODE = '42P01';

/**
 * PostgreSQL undefined-column error code.
 *
 * @private function of `userChat`
 */
const POSTGRES_UNDEFINED_COLUMN_ERROR_CODE = '42703';

/**
 * `$provideClientSql` error fragment used when no direct SQL connection is configured.
 *
 * @private function of `userChat`
 */
const CLIENT_SQL_MISSING_CONNECTION_MESSAGE_FRAGMENT =
    'Environment variable `POSTGRES_URL` or `DATABASE_URL` must be defined.';

/**
 * Lists all user chats for one agent ordered by last activity.
 */
export async function listUserChats(options: ListUserChatsOptions): Promise<Array<UserChatRecord>> {
    const { userId, viewerIsAdmin, agentPermanentId, includeExternalChats = false } = options;
    const userChatTable = await provideUserChatTable();
    const shouldLoadExternalChats = viewerIsAdmin && includeExternalChats;
    const query = shouldLoadExternalChats
        ? userChatTable.select('*').eq('agentPermanentId', agentPermanentId)
        : userChatTable
              .select('*')
              .eq('userId', userId)
              .eq('agentPermanentId', agentPermanentId)
              .eq('source', USER_CHAT_SOURCES.WEB_UI);
    const { data, error } = await query
        .order('lastMessageAt', { ascending: false, nullsFirst: false })
        .order('updatedAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user chats: ${error.message}`);
    }

    const chats = ((data || []) as Array<UserChatRow>).map(mapUserChatRow);

    if (!shouldLoadExternalChats) {
        return chats;
    }

    return chats.filter((chat) =>
        chat.source === USER_CHAT_SOURCES.WEB_UI ? chat.userId === userId : true,
    );
}

/**
 * Lists lightweight chat-summary seeds without loading full `messages` JSON payloads.
 *
 * @private function of `userChat`
 */
export async function listUserChatSummarySeeds(options: ListUserChatsOptions): Promise<Array<UserChatSummarySeed>> {
    if (!isDirectSqlConnectionConfigured()) {
        return listUserChatSummarySeedsViaSupabase(options);
    }

    const userChatTableName = quoteIdentifier(await $getTableName('UserChat'));
    const sql = await $provideClientSql();
    const shouldLoadExternalChats = options.viewerIsAdmin && options.includeExternalChats;

    const whereClause = shouldLoadExternalChats
        ? `
            "agentPermanentId" = $1
            AND ("source" <> '${USER_CHAT_SOURCES.WEB_UI}' OR "userId" = $2)
        `
        : `
            "userId" = $1
            AND "agentPermanentId" = $2
            AND "source" = '${USER_CHAT_SOURCES.WEB_UI}'
        `;
    const queryValues = shouldLoadExternalChats
        ? [options.agentPermanentId, options.userId]
        : [options.userId, options.agentPermanentId];
    try {
        const summaryRows = await sql.raw<Array<UserChatSummarySeedSqlRow>>(
            `
                SELECT
                    "id",
                    "createdAt",
                    "updatedAt",
                    "lastMessageAt",
                    "source",
                    COALESCE(jsonb_array_length("messages"), 0) AS "messagesCount",
                    COALESCE(
                        (
                            SELECT message."value"->>'content'
                            FROM jsonb_array_elements("messages") WITH ORDINALITY AS message("value", "ordinality")
                            WHERE UPPER(COALESCE(message."value"->>'sender', '')) = 'USER'
                            ORDER BY message."ordinality" ASC
                            LIMIT 1
                        ),
                        ''
                    ) AS "firstUserMessageContent",
                    COALESCE(
                        (
                            SELECT message."value"->>'content'
                            FROM jsonb_array_elements("messages") WITH ORDINALITY AS message("value", "ordinality")
                            WHERE LENGTH(BTRIM(COALESCE(message."value"->>'content', ''))) > 0
                            ORDER BY message."ordinality" DESC
                            LIMIT 1
                        ),
                        ''
                    ) AS "lastPreviewMessageContent",
                    COALESCE(
                        (
                            SELECT COUNT(*)::INT
                            FROM jsonb_array_elements("messages") AS message("value")
                            WHERE
                                UPPER(COALESCE(message."value"->>'sender', '')) IN ('AGENT', 'MODEL')
                                AND (
                                    COALESCE(message."value"->>'isComplete', '') = 'false'
                                    OR LOWER(COALESCE(message."value"->>'lifecycleState', '')) IN ('queued', 'running')
                                )
                        ),
                        0
                    ) AS "pendingAssistantMessageCount"
                FROM ${userChatTableName}
                WHERE ${whereClause}
                ORDER BY "lastMessageAt" DESC NULLS LAST, "updatedAt" DESC
            `,
            queryValues,
        );

        return summaryRows.map(mapUserChatSummarySeedSqlRow);
    } catch (error) {
        if (!isUserChatSummarySeedSqlFallbackError(error)) {
            throw error;
        }

        return listUserChatSummarySeedsViaSupabase(options);
    }
}

/**
 * Raw SQL row shape loaded for lightweight chat summary seeds.
 *
 * @private function of `userChat`
 */
type UserChatSummarySeedSqlRow = {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    source: UserChatSource;
    messagesCount: number | string;
    firstUserMessageContent: string | null;
    lastPreviewMessageContent: string | null;
    pendingAssistantMessageCount: number | string;
};

/**
 * Maps one SQL summary row into a normalized lightweight seed.
 *
 * @private function of `userChat`
 */
function mapUserChatSummarySeedSqlRow(row: UserChatSummarySeedSqlRow): UserChatSummarySeed {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastMessageAt: row.lastMessageAt,
        source: row.source,
        messagesCount: parseNonNegativeInteger(row.messagesCount),
        firstUserMessageContent: row.firstUserMessageContent || '',
        lastPreviewMessageContent: row.lastPreviewMessageContent || '',
        pendingAssistantMessageCount: parseNonNegativeInteger(row.pendingAssistantMessageCount),
    };
}

/**
 * Parses one SQL integer-like value while guarding against invalid/negative values.
 *
 * @private function of `userChat`
 */
function parseNonNegativeInteger(value: number | string): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return 0;
    }

    return parsedValue;
}

/**
 * Quotes one trusted SQL identifier.
 *
 * @private function of `userChat`
 */
function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Returns `true` when direct SQL connection environment is configured.
 *
 * @private function of `userChat`
 */
function isDirectSqlConnectionConfigured(): boolean {
    return Boolean((process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim());
}

/**
 * Returns true when SQL-summary optimization should gracefully fallback to Supabase reads.
 *
 * @private function of `userChat`
 */
function isUserChatSummarySeedSqlFallbackError(error: unknown): boolean {
    const errorCode =
        typeof error === 'object' &&
        error !== null &&
        typeof (error as { code?: unknown }).code === 'string'
            ? (error as { code: string }).code
            : '';
    const errorMessage =
        error instanceof Error
            ? error.message
            : typeof error === 'object' &&
                error !== null &&
                typeof (error as { message?: unknown }).message === 'string'
              ? (error as { message: string }).message
              : String(error);

    if (
        errorCode === POSTGRES_UNDEFINED_TABLE_ERROR_CODE ||
        errorCode === POSTGRES_UNDEFINED_COLUMN_ERROR_CODE
    ) {
        return true;
    }

    if (errorMessage.includes(CLIENT_SQL_MISSING_CONNECTION_MESSAGE_FRAGMENT)) {
        return true;
    }

    return /relation .* does not exist|column .* does not exist/i.test(errorMessage);
}

/**
 * Loads chat-summary seeds using standard Supabase reads when SQL optimization is unavailable.
 *
 * @private function of `userChat`
 */
async function listUserChatSummarySeedsViaSupabase(options: ListUserChatsOptions): Promise<Array<UserChatSummarySeed>> {
    const chats = await listUserChats(options);
    return chats.map(createUserChatSummarySeedFromChatRecord);
}

/**
 * Maps one full chat record into a lightweight summary seed.
 *
 * @private function of `userChat`
 */
function createUserChatSummarySeedFromChatRecord(chat: UserChatRecord): UserChatSummarySeed {
    return {
        id: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt,
        source: chat.source,
        messagesCount: chat.messages.length,
        firstUserMessageContent: resolveFirstUserMessageContent(chat.messages),
        lastPreviewMessageContent: resolveLastPreviewMessageContent(chat.messages),
        pendingAssistantMessageCount: countPendingAssistantMessages(chat.messages),
    };
}

/**
 * Resolves first user-authored message content for chat title derivation.
 *
 * @private function of `userChat`
 */
function resolveFirstUserMessageContent(messages: ReadonlyArray<UserChatRecord['messages'][number]>): string {
    const firstUserMessage = messages.find((message) => String(message.sender || '').toUpperCase() === 'USER');
    return normalizeMessageContent(firstUserMessage?.content);
}

/**
 * Resolves latest non-empty message content used as sidebar preview text.
 *
 * @private function of `userChat`
 */
function resolveLastPreviewMessageContent(messages: ReadonlyArray<UserChatRecord['messages'][number]>): string {
    for (let index = messages.length - 1; index >= 0; index--) {
        const normalizedContent = normalizeMessageContent(messages[index]?.content);
        if (normalizedContent) {
            return normalizedContent;
        }
    }

    return '';
}

/**
 * Counts in-progress assistant/model messages for running-activity indicators.
 *
 * @private function of `userChat`
 */
function countPendingAssistantMessages(messages: ReadonlyArray<UserChatRecord['messages'][number]>): number {
    return messages.filter((message) => {
        const sender = String(message.sender || '').toUpperCase();
        if (sender !== 'AGENT' && sender !== 'MODEL') {
            return false;
        }

        return (
            message.isComplete === false ||
            message.lifecycleState === 'queued' ||
            message.lifecycleState === 'running'
        );
    }).length;
}

/**
 * Normalizes unknown message content to a trimmed plain string.
 *
 * @private function of `userChat`
 */
function normalizeMessageContent(content: unknown): string {
    if (typeof content !== 'string') {
        return '';
    }

    return content.trim();
}
