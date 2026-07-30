import type { SupabaseClient } from '@supabase/supabase-js';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { invalidateMetadataCache } from '../../database/getMetadata';
import type { ProvidedServer } from '../../tools/$provideServer';
import { runWithServerContextOverride } from '../../tools/serverContextOverride';
import { createServerPublicUrl, type ServerRecord } from '../serverRegistry';

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
 * Minimal metadata row used by server setup and renaming.
 *
 * @private type of server management.
 */
type ServerMetadataRow = {
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
 * Applies visible setup values into the metadata table of one explicitly selected server.
 *
 * The caller supplies the server instead of relying on the request host because the
 * Super Admin can update a different server on the same VPS.
 *
 * @param input - Target server and optional metadata values.
 *
 * @private internal server management helper.
 */
export async function applyServerMetadata(input: {
    readonly server: ServerRecord;
    readonly name?: string | null;
    readonly iconUrl?: string | null;
}): Promise<void> {
    const metadataRows = createServerMetadataRows(input);
    if (metadataRows.length === 0) {
        return;
    }

    await runWithServerContextOverride(createProvidedServer(input.server), async () => {
        const metadataTableName = await $getTableName('Metadata');
        const supabase = $provideSupabaseForServer() as SupabaseClient;
        await writeServerMetadataRows({
            metadataRows,
            metadataTableName,
            serverName: input.server.name,
            supabase,
        });

        invalidateMetadataCache();
    });
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
    return runWithServerContextOverride(createProvidedServer(server), async () => {
        const metadataTableName = await $getTableName('Metadata');
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
    });
}

/**
 * Creates the routing context required to access one server's isolated metadata.
 *
 * @param server - Server whose metadata should be accessed.
 * @returns Explicit routing context for the server.
 *
 * @private function of standalone VPS server management.
 */
function createProvidedServer(server: ServerRecord): ProvidedServer {
    return {
        id: server.id,
        publicUrl: createServerPublicUrl(server.domain),
        tablePrefix: server.tablePrefix,
    };
}

/**
 * Updates metadata rows when they exist and creates them when they do not.
 *
 * This deliberately does not use the Supabase `upsert` convenience method because
 * the standalone SQLite adapter cannot overwrite an existing metadata row through it.
 *
 * @param input - Target table, rows, and client for the selected server.
 * @private function of standalone VPS server management.
 */
async function writeServerMetadataRows(input: {
    readonly metadataRows: ReadonlyArray<ServerMetadataRow>;
    readonly metadataTableName: string;
    readonly serverName: string;
    readonly supabase: SupabaseClient;
}): Promise<void> {
    for (const metadataRow of input.metadataRows) {
        const { data: updatedRows, error: updateError } = await input.supabase
            .from(input.metadataTableName)
            .update({
                value: metadataRow.value,
                updatedAt: metadataRow.updatedAt,
            })
            .eq('key', metadataRow.key)
            .select('key');

        if (updateError) {
            throw createServerMetadataWriteError(input.serverName, metadataRow.key, updateError.message);
        }

        if ((updatedRows ?? []).length > 0) {
            continue;
        }

        const { error: insertError } = await input.supabase.from(input.metadataTableName).insert(metadataRow);
        if (insertError) {
            throw createServerMetadataWriteError(input.serverName, metadataRow.key, insertError.message);
        }
    }
}

/**
 * Creates a branded error for a failed server-specific metadata write.
 *
 * @param serverName - Name of the server whose metadata could not be persisted.
 * @param metadataKey - Metadata key that could not be persisted.
 * @param details - Database error details.
 * @returns Branded metadata persistence error.
 * @private function of standalone VPS server management.
 */
function createServerMetadataWriteError(serverName: string, metadataKey: string, details: string): DatabaseError {
    return new DatabaseError(
        spaceTrim(`
            Failed to update metadata \`${metadataKey}\` for server \`${serverName}\`.

            ${details}
        `),
    );
}

/**
 * Creates metadata rows from visible setup fields.
 *
 * @param input - Raw setup values.
 * @returns Metadata rows ready for persistence.
 *
 * @private function of standalone VPS server management.
 */
function createServerMetadataRows(input: {
    readonly name?: string | null;
    readonly iconUrl?: string | null;
}): ReadonlyArray<ServerMetadataRow> {
    const updatedAt = new Date().toISOString();
    const rows: Array<ServerMetadataRow> = [];
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
