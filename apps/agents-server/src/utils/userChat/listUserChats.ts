import { $getTableName } from '@/src/database/$getTableName';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import { isAgentsServerSqliteMode } from '@/src/database/agentsServerDatabaseMode';
import { $provideAgentsServerSqliteDatabase } from '@/src/database/sqlite/$provideAgentsServerSqliteDatabase';
import { ensureLocalSqliteTableReadIndexes } from '@/src/database/sqlite/$provideLocalSqliteSupabase';
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
 * SQLite expression that safely exposes chat messages as a JSON array.
 *
 * @private function of `userChat`
 */
const SQLITE_CHAT_MESSAGES_JSON_EXPRESSION = `CASE WHEN json_valid(chat."messages") THEN chat."messages" ELSE '[]' END`;

/**
 * Lists all user chats for one agent ordered by creation time (newest first).
 */
export async function listUserChats(options: ListUserChatsOptions): Promise<Array<UserChatRecord>> {
    const { userId, viewerIsAdmin, viewerIsSuperAdmin = false, agentPermanentId, includeExternalChats = false } = options;
    const userChatTable = await provideUserChatTable();
    const shouldLoadExternalChats = (viewerIsAdmin || viewerIsSuperAdmin) && includeExternalChats;
    const query = shouldLoadExternalChats
        ? userChatTable.select('*').eq('agentPermanentId', agentPermanentId)
        : userChatTable
              .select('*')
              .eq('userId', userId)
              .eq('agentPermanentId', agentPermanentId)
              .eq('source', USER_CHAT_SOURCES.WEB_UI);
    const { data, error } = await query.order('createdAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user chats: ${error.message}`);
    }

    const chats = ((data || []) as Array<UserChatRow>).map(mapUserChatRow);

    if (!shouldLoadExternalChats) {
        return chats;
    }

    if (viewerIsSuperAdmin) {
        // Note: Super-admins reviewing external chats see every chat of every user on the server
        return chats;
    }

    return chats.filter((chat) =>
        chat.source === USER_CHAT_SOURCES.WEB_UI ? chat.userId === userId : true,
    );
}

/**
 * Lists lightweight chat-summary seeds without loading full `messages` JSON payloads, ordered by creation time (newest first).
 *
 * @private function of `userChat`
 */
export async function listUserChatSummarySeeds(options: ListUserChatsOptions): Promise<Array<UserChatSummarySeed>> {
    if (isAgentsServerSqliteMode()) {
        return listUserChatSummarySeedsViaSqlite(options);
    }

    if (!isDirectSqlConnectionConfigured()) {
        return listUserChatSummarySeedsViaSupabase(options);
    }

    const userChatTableName = quoteIdentifier(await $getTableName('UserChat'));
    const sql = await $provideClientSql();
    const shouldLoadAllUsersChats = Boolean(options.viewerIsSuperAdmin && options.includeExternalChats);
    const shouldLoadExternalChats =
        shouldLoadAllUsersChats || (options.viewerIsAdmin && options.includeExternalChats);

    const whereClause = shouldLoadAllUsersChats
        ? `
            "agentPermanentId" = $1
        `
        : shouldLoadExternalChats
        ? `
            "agentPermanentId" = $1
            AND ("source" <> '${USER_CHAT_SOURCES.WEB_UI}' OR "userId" = $2)
        `
        : `
            "userId" = $1
            AND "agentPermanentId" = $2
            AND "source" = '${USER_CHAT_SOURCES.WEB_UI}'
        `;
    const queryValues = shouldLoadAllUsersChats
        ? [options.agentPermanentId]
        : shouldLoadExternalChats
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
                    "title",
                    "source",
                    "userId",
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
                ORDER BY "createdAt" DESC
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
 * Lists lightweight chat-summary seeds through direct SQLite JSON queries.
 *
 * @private function of `userChat`
 */
async function listUserChatSummarySeedsViaSqlite(options: ListUserChatsOptions): Promise<Array<UserChatSummarySeed>> {
    const rawUserChatTableName = await $getTableName('UserChat');
    ensureLocalSqliteTableReadIndexes(rawUserChatTableName);

    const userChatTableName = quoteIdentifier(rawUserChatTableName);
    const shouldLoadAllUsersChats = Boolean(options.viewerIsSuperAdmin && options.includeExternalChats);
    const shouldLoadExternalChats =
        shouldLoadAllUsersChats || (options.viewerIsAdmin && options.includeExternalChats);
    const whereClause = shouldLoadAllUsersChats
        ? `
            chat."agentPermanentId" = ?
        `
        : shouldLoadExternalChats
        ? `
            chat."agentPermanentId" = ?
            AND (chat."source" <> ? OR chat."userId" = ?)
        `
        : `
            chat."userId" = ?
            AND chat."agentPermanentId" = ?
            AND chat."source" = ?
        `;
    const queryValues = shouldLoadAllUsersChats
        ? [options.agentPermanentId]
        : shouldLoadExternalChats
        ? [options.agentPermanentId, USER_CHAT_SOURCES.WEB_UI, options.userId]
        : [options.userId, options.agentPermanentId, USER_CHAT_SOURCES.WEB_UI];

    try {
        const database = $provideAgentsServerSqliteDatabase();
        const summaryRows = database
            .prepare(
                `
                    SELECT
                        chat."id",
                        chat."createdAt",
                        chat."updatedAt",
                        chat."lastMessageAt",
                        chat."title",
                        chat."source",
                        chat."userId",
                        COALESCE(json_array_length(${SQLITE_CHAT_MESSAGES_JSON_EXPRESSION}), 0) AS "messagesCount",
                        COALESCE(
                            (
                                SELECT CAST(json_extract(message.value, '$.content') AS TEXT)
                                FROM json_each(${SQLITE_CHAT_MESSAGES_JSON_EXPRESSION}) AS message
                                WHERE UPPER(CAST(COALESCE(json_extract(message.value, '$.sender'), '') AS TEXT)) = 'USER'
                                ORDER BY CAST(message.key AS INTEGER) ASC
                                LIMIT 1
                            ),
                            ''
                        ) AS "firstUserMessageContent",
                        COALESCE(
                            (
                                SELECT CAST(json_extract(message.value, '$.content') AS TEXT)
                                FROM json_each(${SQLITE_CHAT_MESSAGES_JSON_EXPRESSION}) AS message
                                WHERE LENGTH(TRIM(CAST(COALESCE(json_extract(message.value, '$.content'), '') AS TEXT))) > 0
                                ORDER BY CAST(message.key AS INTEGER) DESC
                                LIMIT 1
                            ),
                            ''
                        ) AS "lastPreviewMessageContent",
                        COALESCE(
                            (
                                SELECT COUNT(*)
                                FROM json_each(${SQLITE_CHAT_MESSAGES_JSON_EXPRESSION}) AS message
                                WHERE
                                    UPPER(CAST(COALESCE(json_extract(message.value, '$.sender'), '') AS TEXT)) IN ('AGENT', 'MODEL')
                                    AND (
                                        json_extract(message.value, '$.isComplete') = 0
                                        OR LOWER(CAST(COALESCE(json_extract(message.value, '$.isComplete'), '') AS TEXT)) = 'false'
                                        OR LOWER(CAST(COALESCE(json_extract(message.value, '$.lifecycleState'), '') AS TEXT)) IN ('queued', 'running')
                                    )
                            ),
                            0
                        ) AS "pendingAssistantMessageCount"
                    FROM ${userChatTableName} AS chat
                    WHERE ${whereClause}
                    ORDER BY chat."createdAt" DESC
                `,
            )
            .all(...queryValues) as Array<UserChatSummarySeedSqlRow>;

        return summaryRows.map(mapUserChatSummarySeedSqlRow);
    } catch (error) {
        if (!isUserChatSummarySeedSqliteFallbackError(error)) {
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
    title: string | null;
    source: UserChatSource;
    userId: number | string;
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
        title: row.title,
        source: row.source,
        userId: parseNonNegativeInteger(row.userId),
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
 * Returns true when SQLite summary optimization should gracefully fallback to Supabase-shaped reads.
 *
 * @private function of `userChat`
 */
function isUserChatSummarySeedSqliteFallbackError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return /no such table|no such column|no such function: json_|malformed JSON/i.test(errorMessage);
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
        title: chat.title,
        source: chat.source,
        userId: chat.userId,
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
