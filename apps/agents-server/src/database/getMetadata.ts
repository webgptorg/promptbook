import { $getTableName } from './$getTableName';
import { $provideSupabase } from './$provideSupabase';
import { metadataDefaults } from './metadataDefaults';
import { cache } from 'react';

/**
 * Precomputed map of default metadata values to avoid re-iterating the defaults array.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
const metadataDefaultsMap = new Map<string, string>(metadataDefaults.map((metadata) => [metadata.key, metadata.value]));

/**
 * Process-level cache lifetime for metadata reads.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
const METADATA_CACHE_TTL_MS = 30_000;

/**
 * Cached metadata table payload keyed by the resolved table name.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
const cachedMetadataValuesByTableName = new Map<
    string,
    {
        readonly loadedAt: number;
        readonly valuesPromise: Promise<Map<string, string | null>>;
    }
>();

/**
 * Metadata row shape loaded by the lightweight metadata select.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
type MetadataValueRow = {
    readonly key: string;
    readonly value: string | null;
};

/**
 * Clears process-level metadata cache after admin metadata writes.
 *
 * @public exported from `apps/agents-server`
 */
export function invalidateMetadataCache(): void {
    cachedMetadataValuesByTableName.clear();
}

/**
 * Loads the full metadata table once per request so callers can cheaply project subsets.
 *
 * @returns Map of metadata keys to stored values.
 *
 * @private Internal helper for batched metadata lookups in `apps/agents-server`.
 */
const loadAllMetadataValues = cache(async (): Promise<Map<string, string | null>> => {
    const table = await $getTableName('Metadata');
    return loadCachedMetadataValues(table);
});

/**
 * Loads metadata values using a short process-level cache shared by consecutive requests.
 *
 * @param table - Resolved metadata table name.
 * @returns Metadata values keyed by metadata key.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
async function loadCachedMetadataValues(table: string): Promise<Map<string, string | null>> {
    const cachedMetadataValues = cachedMetadataValuesByTableName.get(table);
    if (cachedMetadataValues && Date.now() - cachedMetadataValues.loadedAt < METADATA_CACHE_TTL_MS) {
        return cachedMetadataValues.valuesPromise;
    }

    const valuesPromise = loadMetadataValuesFromDatabase(table);
    cachedMetadataValuesByTableName.set(table, {
        loadedAt: Date.now(),
        valuesPromise,
    });

    try {
        return await valuesPromise;
    } catch (error) {
        if (cachedMetadataValuesByTableName.get(table)?.valuesPromise === valuesPromise) {
            cachedMetadataValuesByTableName.delete(table);
        }
        throw error;
    }
}

/**
 * Reads all persisted metadata values from the database.
 *
 * @param table - Resolved metadata table name.
 * @returns Metadata values keyed by metadata key.
 *
 * @private Internal helper for metadata lookups in `apps/agents-server`.
 */
async function loadMetadataValuesFromDatabase(table: string): Promise<Map<string, string | null>> {
    const supabase = $provideSupabase();
    const { data } = await supabase.from(table).select('key, value');

    const loadedMap = new Map<string, string | null>();
    for (const row of (data ?? []) as Array<MetadataValueRow>) {
        loadedMap.set(row.key, row.value);
    }

    return loadedMap;
}

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

    const loadedMap = await loadAllMetadataValues();

    const metadataRecord: Record<string, string | null> = {};
    for (const key of uniqueKeys) {
        metadataRecord[key] = loadedMap.get(key) ?? metadataDefaultsMap.get(key) ?? null;
    }

    return metadataRecord;
}
