import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabase } from '../../../../database/$provideSupabase';
import type { ChatHistoryRow } from '../ChatHistoryRow';

/**
 * @private Number of rows fetched per page when scanning chat history.
 */
const CHAT_HISTORY_PAGE_SIZE = 1000;

/**
 * @private Utilities that load data needed by the usage analytics endpoint.
 */
export const UsageDataAccess = {
    fetchChatHistoryRows,
    resolveApiKeyNotes,
    resolveUsernamesForIds,
    resolveUsageUsername,
} as const;

/**
 * @private Loads chat history rows within the provided interval, paging around PostgREST limits.
 */
async function fetchChatHistoryRows(options: {
    fromIso: string;
    toIso: string;
    allowedAgentNames: Set<string> | null;
}): Promise<ChatHistoryRow[]> {
    const { fromIso, toIso, allowedAgentNames } = options;
    const supabase = $provideSupabase();
    const tableName = await $getTableName('ChatHistory');
    const rows: ChatHistoryRow[] = [];

    for (let offset = 0; ; offset += CHAT_HISTORY_PAGE_SIZE) {
        let query = supabase
            .from(tableName)
            .select('createdAt, agentName, message, source, apiKey, userAgent, actorType, usage, userId')
            .gte('createdAt', fromIso)
            .lte('createdAt', toIso)
            .order('createdAt', { ascending: true });

        if (allowedAgentNames !== null) {
            query = query.in('agentName', [...allowedAgentNames]);
        }

        const { data, error } = await query.range(offset, offset + CHAT_HISTORY_PAGE_SIZE - 1);
        if (error) {
            throw new Error(`Failed to load usage rows: ${error.message}`);
        }

        const pageRows = (data || []) as ChatHistoryRow[];
        rows.push(...pageRows);

        if (pageRows.length < CHAT_HISTORY_PAGE_SIZE) {
            break;
        }
    }

    return rows;
}

/**
 * @private Loads API token notes for the provided keys.
 */
async function resolveApiKeyNotes(apiKeys: string[]): Promise<Map<string, string | null>> {
    const notes = new Map<string, string | null>();
    if (apiKeys.length === 0) {
        return notes;
    }

    const supabase = $provideSupabase();
    const tableName = await $getTableName('ApiTokens');
    const { data, error } = await supabase.from(tableName).select('token, note').in('token', apiKeys);

    if (error) {
        console.warn('Usage analytics: failed to resolve API token notes.', error);
        return notes;
    }

    for (const row of (data || []) as Array<{ token: string; note: string | null }>) {
        notes.set(row.token, row.note);
    }

    return notes;
}

/**
 * @private Loads usernames for the provided IDs so the analytics UI can display them.
 */
async function resolveUsernamesForIds(userIds: number[]): Promise<Map<number, string>> {
    const usernames = new Map<number, string>();
    if (userIds.length === 0) {
        return usernames;
    }

    const supabase = $provideSupabase();
    const tableName = await $getTableName('User');
    const { data, error } = await supabase.from(tableName).select('id, username').in('id', userIds);

    if (error) {
        console.warn('Usage analytics: failed to resolve usernames for usage rows.', error);
        return usernames;
    }

    for (const row of (data || []) as Array<{ id: number; username: string }>) {
        usernames.set(row.id, row.username);
    }

    return usernames;
}

/**
 * @private Returns the localized label for a usage user bucket.
 */
function resolveUsageUsername(userId: number | null, usernamesById: Map<number, string>): string {
    if (userId === null) {
        return '(unattributed user)';
    }

    return usernamesById.get(userId) || `User #${userId}`;
}
