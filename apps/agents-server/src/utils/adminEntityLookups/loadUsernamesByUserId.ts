import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Minimal user lookup row needed to name the owner of one admin row.
 *
 * @private type of `loadUsernamesByUserId`
 */
type UsernameLookupRow = Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'id' | 'username'>;

/**
 * Loads usernames keyed by user id, for admin listings that only store the owning user id.
 *
 * @param userIds - Ids of the users to name, duplicates allowed.
 * @returns Usernames keyed by user id, empty when nothing was asked for.
 *
 * @private internal admin utility of Agents Server
 */
export async function loadUsernamesByUserId(userIds: ReadonlyArray<number>): Promise<Map<number, string>> {
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
        return new Map();
    }

    const supabase = $provideSupabaseForServer();
    const userTable = await $getTableName('User');
    const { data, error } = await supabase.from(userTable).select('id,username').in('id', uniqueUserIds);

    if (error) {
        throw new Error(`Failed to load admin listing users: ${error.message}`);
    }

    return new Map(((data || []) as Array<UsernameLookupRow>).map((userRow) => [userRow.id, userRow.username] as const));
}
