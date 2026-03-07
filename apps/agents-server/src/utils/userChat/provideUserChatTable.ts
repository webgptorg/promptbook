import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';

/**
 * Returns a scoped Supabase table client for `UserChat`.
 *
 * @private function of `userChat`
 */
export async function provideUserChatTable() {
    const tableName = await $getTableName('UserChat');
    const supabase = $provideSupabaseForServer();
    return supabase.from(tableName);
}
