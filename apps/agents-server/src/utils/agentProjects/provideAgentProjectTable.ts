import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';

/**
 * Returns a scoped Supabase table client for `AgentProject`.
 */
export async function provideAgentProjectTable() {
    const tableName = await $getTableName('AgentProject');
    const supabase = $provideSupabaseForServer();
    return supabase.from(tableName);
}
