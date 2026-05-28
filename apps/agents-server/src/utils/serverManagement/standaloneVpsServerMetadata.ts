import type { SupabaseClient } from '@supabase/supabase-js';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { ServerRecord } from '../serverRegistry';

/**
 * Metadata key storing the human-facing server name.
 *
 * @private constant of standalone VPS server management.
 */
const SERVER_NAME_METADATA_KEY = 'SERVER_NAME';

/**
 * Metadata keys that use the uploaded server icon.
 *
 * @private constant of standalone VPS server management.
 */
const SERVER_ICON_METADATA_KEYS = ['SERVER_LOGO_URL', 'SERVER_FAVICON_URL'] as const;

/**
 * Minimal metadata row used by standalone VPS server setup.
 *
 * @private type of standalone VPS server management.
 */
type StandaloneVpsMetadataRow = {
    /**
     * Metadata key.
     */
    readonly key: string;

    /**
     * Metadata value.
     */
    readonly value: string;

    /**
     * Optional admin-facing note.
     */
    readonly note: string | null;

    /**
     * Last update timestamp.
     */
    readonly updatedAt: string;
};

/**
 * Applies visible standalone VPS setup values into the prefixed metadata table.
 *
 * @param input - Server prefix and optional metadata values.
 *
 * @private internal standalone VPS server management helper.
 */
export async function applyStandaloneVpsServerMetadata(input: {
    readonly tablePrefix: string;
    readonly name?: string | null;
    readonly iconUrl?: string | null;
}): Promise<void> {
    const metadataRows = createStandaloneVpsMetadataRows(input);
    if (metadataRows.length === 0) {
        return;
    }

    const metadataTableName = `${input.tablePrefix}Metadata`;
    const supabase = $provideSupabaseForServer() as SupabaseClient;
    const { error } = await supabase.from(metadataTableName).upsert([...metadataRows], {
        onConflict: 'key',
    });

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to update standalone VPS server metadata.

                ${error.message}
            `),
        );
    }
}

/**
 * Resolves the configured display name for a standalone VPS virtual server.
 *
 * @param server - Virtual server row derived from the `SERVERS` environment variable.
 * @returns Metadata server name or the virtual row name when metadata is missing.
 *
 * @private internal standalone VPS server management helper.
 */
export async function resolveStandaloneVpsServerDisplayName(server: ServerRecord): Promise<string> {
    const metadataTableName = `${server.tablePrefix}Metadata`;
    const supabase = $provideSupabaseForServer() as SupabaseClient;
    const { data, error } = await supabase
        .from(metadataTableName)
        .select('value')
        .eq('key', SERVER_NAME_METADATA_KEY)
        .maybeSingle<{ readonly value: string | null }>();

    if (error) {
        return server.name;
    }

    const metadataName = typeof data?.value === 'string' ? data.value.trim() : '';
    return metadataName || server.name;
}

/**
 * Creates metadata rows from visible setup fields.
 *
 * @param input - Raw setup values.
 * @returns Metadata rows ready for upsert.
 *
 * @private function of standalone VPS server management.
 */
function createStandaloneVpsMetadataRows(input: {
    readonly name?: string | null;
    readonly iconUrl?: string | null;
}): ReadonlyArray<StandaloneVpsMetadataRow> {
    const updatedAt = new Date().toISOString();
    const rows: Array<StandaloneVpsMetadataRow> = [];
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const iconUrl = typeof input.iconUrl === 'string' ? input.iconUrl.trim() : '';

    if (name) {
        rows.push({
            key: SERVER_NAME_METADATA_KEY,
            value: name,
            note: null,
            updatedAt,
        });
    }

    if (iconUrl) {
        for (const key of SERVER_ICON_METADATA_KEYS) {
            rows.push({
                key,
                value: iconUrl,
                note: null,
                updatedAt,
            });
        }
    }

    return rows;
}
