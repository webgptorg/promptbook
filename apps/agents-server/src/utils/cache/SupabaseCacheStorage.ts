import { TODO_any } from '@promptbook-local/types';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { Json } from '../../database/schema';

/**
 * Storage for LLM cache using Supabase
 */
export class SupabaseCacheStorage {
    // implements PromptbookStorage<TODO_any>

    /**
     * Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    public async getItem(key: string): Promise<TODO_any | null> {
        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('LlmCache');

        const { data } = await supabase.from(tableName).select('value').eq('hash', key).maybeSingle();

        if (!data) {
            return null;
        }

        return data.value;
    }

    /**
     * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    public async setItem(key: string, value: TODO_any): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('LlmCache');

        await supabase.from(tableName).upsert(
            {
                hash: key,
                value: value as Json,
            },
            {
                onConflict: 'hash',
            },
        );
    }

    /**
     * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists
     */
    public async removeItem(key: string): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const tableName = await $getTableName('LlmCache');

        await supabase.from(tableName).delete().eq('hash', key);
    }
}
