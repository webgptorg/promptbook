import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../../database/schema';
import { sortBackupRows } from './serverBackupRowUtilities';
import type { AgentRow, ChatFeedbackRow, UserChatRow, UserRow } from './serverBackupTypes';

/**
 * JSON payload persisted for legacy table-backed exports.
 *
 * @private type of `createServerBackupZipStream`
 */
export type BackupTableFilePayload = {
    /**
     * Logical entity name from the generated schema types.
     */
    readonly entity: keyof AgentsServerDatabase['public']['Tables'];
    /**
     * Physical table name used by the current server installation.
     */
    readonly databaseTable: string;
    /**
     * Total number of exported rows.
     */
    readonly rowCount: number;
    /**
     * Ordered snapshot rows.
     */
    readonly rows: ReadonlyArray<Record<string, unknown>>;
};

/**
 * Shared context with lazy-loaded table snapshots reused across multiple sections.
 *
 * @private type of `createServerBackupZipStream`
 */
export type ServerBackupContext = {
    readonly supabase: ReturnType<typeof $provideSupabaseForServer>;
    userRowsPromise?: Promise<Array<UserRow>>;
    agentRowsPromise?: Promise<Array<AgentRow>>;
    userChatRowsPromise?: Promise<Array<UserChatRow>>;
    chatFeedbackRowsPromise?: Promise<Array<ChatFeedbackRow>>;
};

/**
 * Creates the shared backup context with lazy table loaders.
 *
 * @param supabase - Server-side Supabase client.
 * @returns Reusable backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createServerBackupContext(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
): ServerBackupContext {
    return {
        supabase,
    };
}

/**
 * Reads one logical table and converts it into a deterministic JSON backup payload.
 *
 * @param supabase - Server-side Supabase client.
 * @param tableKey - Logical table key from the generated schema.
 * @returns Serializable table payload for the archive.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function loadBackupTableFilePayload(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
    tableKey: keyof AgentsServerDatabase['public']['Tables'],
): Promise<BackupTableFilePayload> {
    const tableName = await $getTableName(tableKey);
    const result = await supabase.from(tableName).select('*');

    if (result.error) {
        throw new Error(`Unable to load backup table ${tableKey}: ${result.error.message}`);
    }

    const rows = sortBackupRows(
        (((result.data || []) as unknown as Array<Record<string, unknown>>).map((row) => ({ ...row }))),
    );

    return {
        entity: tableKey,
        databaseTable: tableName,
        rowCount: rows.length,
        rows,
    };
}

/**
 * Reads one logical table into typed rows.
 *
 * @param supabase - Server-side Supabase client.
 * @param tableKey - Logical table key from the generated schema.
 * @returns Ordered table rows.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function loadTableRows<TableKey extends keyof AgentsServerDatabase['public']['Tables']>(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
    tableKey: TableKey,
): Promise<Array<AgentsServerDatabase['public']['Tables'][TableKey]['Row']>> {
    const tableName = await $getTableName(tableKey);
    const result = await supabase.from(tableName).select('*');

    if (result.error) {
        throw new Error(`Unable to load backup table ${String(tableKey)}: ${result.error.message}`);
    }

    return sortBackupRows((result.data || []) as unknown as Array<Record<string, unknown>>) as Array<
        AgentsServerDatabase['public']['Tables'][TableKey]['Row']
    >;
}

/**
 * Lazily loads users once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached user rows.
 *
 * @private function of `createServerBackupZipStream`
 */
export function loadUserRows(context: ServerBackupContext): Promise<Array<UserRow>> {
    context.userRowsPromise = context.userRowsPromise || loadTableRows(context.supabase, 'User');
    return context.userRowsPromise;
}

/**
 * Lazily loads agents once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached agent rows.
 *
 * @private function of `createServerBackupZipStream`
 */
export function loadAgentRows(context: ServerBackupContext): Promise<Array<AgentRow>> {
    context.agentRowsPromise = context.agentRowsPromise || loadTableRows(context.supabase, 'Agent');
    return context.agentRowsPromise;
}

/**
 * Lazily loads user chats once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached user-chat rows.
 *
 * @private function of `createServerBackupZipStream`
 */
export function loadUserChatRows(context: ServerBackupContext): Promise<Array<UserChatRow>> {
    context.userChatRowsPromise = context.userChatRowsPromise || loadTableRows(context.supabase, 'UserChat');
    return context.userChatRowsPromise;
}

/**
 * Lazily loads feedback rows once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached feedback rows.
 *
 * @private function of `createServerBackupZipStream`
 */
export function loadChatFeedbackRows(context: ServerBackupContext): Promise<Array<ChatFeedbackRow>> {
    context.chatFeedbackRowsPromise = context.chatFeedbackRowsPromise || loadTableRows(context.supabase, 'ChatFeedback');
    return context.chatFeedbackRowsPromise;
}
