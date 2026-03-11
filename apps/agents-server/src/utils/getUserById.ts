import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Database row shape for `User`.
 */
type UserRow = AgentsServerDatabase['public']['Tables']['User']['Row'];

/**
 * Loads one user row by database id.
 */
export async function getUserById(userId: number): Promise<UserRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('User');
    const { data, error } = await supabase.from(tableName).select('*').eq('id', userId).maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve user "${userId}": ${error.message}`);
    }

    return (data as UserRow | null) || null;
}
