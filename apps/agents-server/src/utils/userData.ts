import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase, Json } from '@/src/database/schema';

/**
 * Database row shape for the `UserData` table.
 */
type UserDataRow = AgentsServerDatabase['public']['Tables']['UserData']['Row'];

/**
 * Input payload for reading one user-data entry.
 */
export type GetUserDataValueOptions = {
    userId: number;
    key: string;
};

/**
 * Input payload for upserting one user-data entry.
 */
export type UpsertUserDataValueOptions = {
    userId: number;
    key: string;
    value: Json;
};

/**
 * Reads one JSON value from `UserData` by `(userId, key)`.
 */
export async function getUserDataValue(options: GetUserDataValueOptions): Promise<Json | null> {
    const { userId, key } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserData');
    const { data, error } = await supabase
        .from(tableName)
        .select('value')
        .eq('userId', userId)
        .eq('key', key)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to read user data "${key}": ${error.message}`);
    }

    return data ? ((data as Pick<UserDataRow, 'value'>).value as Json) : null;
}

/**
 * Creates or updates one JSON value in `UserData`.
 */
export async function upsertUserDataValue(options: UpsertUserDataValueOptions): Promise<UserDataRow> {
    const { userId, key, value } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserData');
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from(tableName)
        .upsert({
            userId,
            key,
            value,
            updatedAt: now,
        })
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to upsert user data "${key}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to upsert user data "${key}".`);
    }

    return data as UserDataRow;
}

