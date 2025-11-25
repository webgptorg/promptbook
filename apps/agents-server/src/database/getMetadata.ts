import { $getTableName } from './$getTableName';
import { $provideSupabase } from './$provideSupabase';
import { metadataDefaults } from './metadataDefaults';

/**
 * Get metadata value by key
 *
 * @param key - The key of the metadata
 * @returns The value of the metadata or default value if not found
 */
export async function getMetadata(key: string): Promise<string | null> {
    const supabase = $provideSupabase();
    const table = await $getTableName('Metadata');

    const { data } = await supabase
        .from(table)
        .select('value')
        .eq('key', key)
        .single();

    if (data) {
        return data.value;
    }

    const defaultValue = metadataDefaults.find((m) => m.key === key);
    if (defaultValue) {
        return defaultValue.value;
    }

    return null;
}
