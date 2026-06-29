import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * User row shape needed by durable chat execution.
 */
type UserByIdRow = Pick<
    AgentsServerDatabase['public']['Tables']['User']['Row'],
    'id' | 'username' | 'isAdmin' | 'profileImageUrl'
>;

/**
 * Supabase projection for user fields needed by durable chat execution.
 */
const USER_BY_ID_SELECT_COLUMNS = 'id, username, isAdmin, profileImageUrl';

/**
 * Loads one user row by database id.
 *
 * @private internal Agents Server user lookup helper
 */
export async function getUserById(userId: number): Promise<UserByIdRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('User');
    const { data, error } = await supabase
        .from(tableName)
        .select(USER_BY_ID_SELECT_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve user "${userId}": ${error.message}`);
    }

    return (data as UserByIdRow | null) || null;
}
