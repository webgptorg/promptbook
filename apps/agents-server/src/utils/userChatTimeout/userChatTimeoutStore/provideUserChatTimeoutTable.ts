import type { TODO_any } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { getUserChatTimeoutTableName } from './getUserChatTimeoutTableName';

/**
 * Provides the scoped Supabase query builder for `UserChatTimeout`.
 *
 * @private function of userChatTimeoutStore
 */
export async function provideUserChatTimeoutTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = await getUserChatTimeoutTableName();

    return supabase.from(tableName);
}
