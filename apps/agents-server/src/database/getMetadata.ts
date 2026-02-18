import { $getTableName } from './$getTableName';
import { $provideSupabase } from './$provideSupabase';
import { metadataDefaults } from './metadataDefaults';

/**
 * Precomputed map of default metadata values to avoid re-iterating the defaults array.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
const metadataDefaultsMap = new Map<string, string>(metadataDefaults.map((metadata) => [metadata.key, metadata.value]));

/**
 * Get metadata value by key
 *
 * @param key - The key of the metadata
 * @returns The value of the metadata or default value if not found
 *
 * @public exported from `apps/agents-server`
 */
export async function getMetadata(key: string): Promise<string | null> {
    const metadataMap = await getMetadataMap([key]);
    return metadataMap[key] ?? null;
}

/**
 * Loads metadata values for multiple keys using a single Supabase round-trip.
 *
 * @param keys - Metadata keys to load.
 * @returns Mapping of keys to stored values or defaults.
 *
 * @private Internal helper for batched metadata lookups in `apps/agents-server`.
 */
export async function getMetadataMap(keys: readonly string[]): Promise<Record<string, string | null>> {
    if (keys.length === 0) {
        return {};
    }

    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
    if (uniqueKeys.length === 0) {
        return {};
    }

    const supabase = $provideSupabase();
    const table = await $getTableName('Metadata');

    const { data } = await supabase.from(table).select('key, value').in('key', uniqueKeys);

    const loadedMap = new Map<string, string | null>();
    for (const row of data ?? []) {
        loadedMap.set(row.key, row.value);
    }

    const metadataRecord: Record<string, string | null> = {};
    for (const key of uniqueKeys) {
        metadataRecord[key] = loadedMap.get(key) ?? metadataDefaultsMap.get(key) ?? null;
    }

    return metadataRecord;
}
