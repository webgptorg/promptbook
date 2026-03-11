import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';

/**
 * Provides the scoped Supabase query builder for `UserChatJob`.
 *
 * @private function of `userChat`
 */
export async function provideUserChatJobTable() {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserChatJob');

    return supabase.from(tableName);
}
