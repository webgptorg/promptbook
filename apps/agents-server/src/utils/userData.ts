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
 * Input payload for reading one user-data entry by `key` regardless of owner.
 */
export type GetAnyUserDataValueByKeyOptions = {
    key: string;
};

/**
 * Input payload for listing all user-data rows by exact `key`.
 */
export type ListUserDataValuesByKeyOptions = {
    key: string;
};

/**
 * One user-data row projection returned by exact-key listing.
 */
export type UserDataValueByKeyRow = Pick<UserDataRow, 'userId' | 'updatedAt' | 'value'>;

/**
 * Input payload for listing one user's keys under a shared prefix.
 */
export type ListUserDataKeysByPrefixForUserOptions = {
    userId: number;
    keyPrefix: string;
};

/**
 * Input payload for deleting multiple user-data rows by keys for one user.
 */
export type DeleteUserDataByKeysForUserOptions = {
    userId: number;
    keys: Array<string>;
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
 * Reads the latest JSON value from `UserData` by `key`, regardless of owner.
 */
export async function getAnyUserDataValueByKey(options: GetAnyUserDataValueByKeyOptions): Promise<Json | null> {
    const { key } = options;
    const rows = await listUserDataValuesByKey({ key });
    return rows[0]?.value || null;
}

/**
 * Lists all user-data rows that match one exact `key`, newest first.
 */
export async function listUserDataValuesByKey(
    options: ListUserDataValuesByKeyOptions,
): Promise<Array<UserDataValueByKeyRow>> {
    const { key } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserData');
    const { data, error } = await supabase
        .from(tableName)
        .select('userId,updatedAt,value')
        .eq('key', key)
        .order('updatedAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user data "${key}": ${error.message}`);
    }

    return ((data || []) as Array<UserDataValueByKeyRow>).slice();
}

/**
 * Lists one user's `UserData.key` values that begin with a shared prefix.
 */
export async function listUserDataKeysByPrefixForUser(
    options: ListUserDataKeysByPrefixForUserOptions,
): Promise<Array<string>> {
    const { userId, keyPrefix } = options;
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserData');
    const { data, error } = await supabase
        .from(tableName)
        .select('key')
        .eq('userId', userId)
        .like('key', `${keyPrefix}%`);

    if (error) {
        throw new Error(`Failed to list user data keys by prefix "${keyPrefix}": ${error.message}`);
    }

    return (data || []).map((row) => (row as Pick<UserDataRow, 'key'>).key);
}

/**
 * Deletes multiple user-data rows by `key` for one user.
 */
export async function deleteUserDataByKeysForUser(options: DeleteUserDataByKeysForUserOptions): Promise<void> {
    const { userId, keys } = options;
    if (keys.length === 0) {
        return;
    }

    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('UserData');
    const { error } = await supabase.from(tableName).delete().eq('userId', userId).in('key', keys);

    if (error) {
        throw new Error(`Failed to delete user data keys: ${error.message}`);
    }
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
        .upsert(
            {
                userId,
                key,
                value,
                updatedAt: now,
            },
            {
                onConflict: 'userId,key',
            },
        )
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
