import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { ParseError } from '../../../../src/errors/ParseError';
import { normalizeToKebabCase } from '../../../../src/utils/normalization/normalize-to-kebab-case';
import { removeEmojis } from '../../../../src/utils/normalization/removeEmojis';
import { PROMPTBOOK_ENGINE_VERSION, type string_promptbook_version } from '../../../../src/version';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { invalidateMetadataCache } from '../database/getMetadata';
import { getMetadataDefinition, metadataDefaults, validateMetadataValue } from '../database/metadataDefaults';
import type { AgentsServerDatabase } from '../database/schema';

/**
 * Metadata key containing the human-readable server name.
 */
const SERVER_NAME_METADATA_KEY = 'SERVER_NAME';

/**
 * Fallback filename stem used when the server name cannot produce a safe name.
 */
const DEFAULT_METADATA_EXPORT_FILENAME_STEM = 'promptbook-agents-server';

/**
 * Filename suffix required for standalone metadata exports.
 */
const METADATA_EXPORT_FILENAME_SUFFIX = '.metadata.json';

/**
 * Minimal metadata row shape needed by import/export helpers.
 */
type MetadataConfigurationRow = Pick<
    AgentsServerDatabase['public']['Tables']['Metadata']['Row'],
    'key' | 'value' | 'note'
>;

/**
 * Metadata row persisted during import.
 */
type MetadataConfigurationImportRow = {
    /**
     * Metadata key.
     */
    readonly key: string;

    /**
     * Metadata value to persist.
     */
    readonly value: string;

    /**
     * Metadata note to persist.
     */
    readonly note: string | null;
};

/**
 * One entry inside the standalone metadata export JSON.
 */
export type MetadataConfigurationExportEntry = {
    /**
     * Metadata key.
     */
    readonly key: string;

    /**
     * Metadata value, omitted when it matches the built-in default.
     */
    readonly value?: string;

    /**
     * Metadata note, omitted when it matches the built-in default note.
     */
    readonly note?: string | null;
};

/**
 * Standalone metadata export JSON payload.
 */
export type MetadataConfigurationExportPayload = {
    /**
     * Promptbook engine version that generated the export.
     */
    readonly promptbookVersion: string_promptbook_version;

    /**
     * Metadata entries with default fields omitted.
     */
    readonly metadata: ReadonlyArray<MetadataConfigurationExportEntry>;
};

/**
 * Prepared metadata import plan before it touches the database.
 */
export type MetadataConfigurationImportPlan = {
    /**
     * Rows that should be inserted or updated.
     */
    readonly rowsToUpsert: ReadonlyArray<MetadataConfigurationImportRow>;

    /**
     * Default-backed keys absent from the import and therefore reset by deleting persisted rows.
     */
    readonly defaultKeysToReset: ReadonlyArray<string>;
};

/**
 * Options controlling standalone metadata import behavior.
 */
export type MetadataConfigurationImportPlanOptions = {
    /**
     * When true, built-in metadata keys missing from the import payload keep their current persisted value.
     */
    readonly isDefaultResetSkipped?: boolean;
};

/**
 * Summary returned after importing metadata.
 */
export type MetadataConfigurationImportSummary = {
    /**
     * Number of metadata rows inserted or updated from the import file.
     */
    readonly importedCount: number;

    /**
     * Number of built-in metadata keys reset to default.
     */
    readonly resetCount: number;
};

/**
 * Full metadata export result used by the API route.
 */
export type MetadataConfigurationExportResult = {
    /**
     * Browser download filename.
     */
    readonly filename: string;

    /**
     * JSON payload to send to the browser.
     */
    readonly payload: MetadataConfigurationExportPayload;
};

/**
 * Creates a standalone metadata export from the current server database.
 *
 * @returns Export filename and payload.
 */
export async function createMetadataConfigurationExport(): Promise<MetadataConfigurationExportResult> {
    const metadataRows = await loadMetadataConfigurationRows();
    const serverName = resolveServerNameFromMetadataRows(metadataRows);

    return {
        filename: createMetadataConfigurationExportFilename(serverName),
        payload: createMetadataConfigurationExportPayload(metadataRows),
    };
}

/**
 * Imports standalone metadata JSON into the current server database.
 *
 * @param payload - Parsed JSON import payload.
 * @param options - Import behavior options.
 * @returns Import summary for the UI.
 */
export async function importMetadataConfigurationPayload(
    payload: unknown,
    options: MetadataConfigurationImportPlanOptions = {},
): Promise<MetadataConfigurationImportSummary> {
    const importPlan = createMetadataConfigurationImportPlan(payload, options);
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Metadata');
    const nowIso = new Date().toISOString();

    if (importPlan.defaultKeysToReset.length > 0) {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .in('key', [...importPlan.defaultKeysToReset]);

        if (error) {
            throw new DatabaseError(
                spaceTrim(`
                    Failed to reset metadata keys to their defaults.

                    ${error.message}
                `),
            );
        }
    }

    if (importPlan.rowsToUpsert.length > 0) {
        const { error } = await supabase.from(tableName).upsert(
            importPlan.rowsToUpsert.map((row) => ({
                ...row,
                updatedAt: nowIso,
            })),
            {
                onConflict: 'key',
            },
        );

        if (error) {
            throw new DatabaseError(
                spaceTrim(`
                    Failed to import metadata configuration.

                    ${error.message}
                `),
            );
        }
    }

    invalidateMetadataCache();

    return {
        importedCount: importPlan.rowsToUpsert.length,
        resetCount: importPlan.defaultKeysToReset.length,
    };
}

/**
 * Creates the standalone export payload from metadata rows.
 *
 * @param metadataRows - Persisted metadata rows.
 * @param promptbookVersion - Promptbook version to include in the export.
 * @returns JSON payload with default fields omitted.
 */
export function createMetadataConfigurationExportPayload(
    metadataRows: ReadonlyArray<MetadataConfigurationRow>,
    promptbookVersion: string_promptbook_version = PROMPTBOOK_ENGINE_VERSION,
): MetadataConfigurationExportPayload {
    const metadata = metadataRows
        .flatMap((metadataRow) => {
            const exportEntry = createMetadataConfigurationExportEntry(metadataRow);
            return exportEntry ? [exportEntry] : [];
        })
        .sort((leftEntry, rightEntry) => leftEntry.key.localeCompare(rightEntry.key));

    return {
        promptbookVersion,
        metadata,
    };
}

/**
 * Creates a browser-safe metadata export filename from the server name.
 *
 * @param serverName - Human-readable server name.
 * @returns Kebab-case metadata export filename.
 */
export function createMetadataConfigurationExportFilename(serverName: string | null | undefined): string {
    const normalizedServerName = normalizeToKebabCase(removeEmojis(serverName || ''));
    const filenameStem = normalizedServerName || DEFAULT_METADATA_EXPORT_FILENAME_STEM;

    return `${filenameStem}${METADATA_EXPORT_FILENAME_SUFFIX}`;
}

/**
 * Validates and normalizes a standalone metadata import payload.
 *
 * @param payload - Parsed JSON import payload.
 * @param options - Import behavior options.
 * @returns Import plan ready for persistence.
 */
export function createMetadataConfigurationImportPlan(
    payload: unknown,
    options: MetadataConfigurationImportPlanOptions = {},
): MetadataConfigurationImportPlan {
    if (!payload || typeof payload !== 'object') {
        throw new ParseError('Metadata import must be a JSON object.');
    }

    const payloadRecord = payload as Record<string, unknown>;

    if (typeof payloadRecord.promptbookVersion !== 'string' || payloadRecord.promptbookVersion.trim() === '') {
        throw new ParseError('Metadata import is missing `promptbookVersion`.');
    }

    if (!Array.isArray(payloadRecord.metadata)) {
        throw new ParseError('Metadata import must contain a `metadata` array.');
    }

    const importedMetadataKeys = new Set<string>();
    const rowsToUpsert = payloadRecord.metadata.map((rawMetadataEntry, index) =>
        normalizeMetadataConfigurationImportEntry(rawMetadataEntry, index, importedMetadataKeys),
    );
    const defaultKeysToReset = options.isDefaultResetSkipped
        ? []
        : metadataDefaults
              .map((metadataDefinition) => metadataDefinition.key)
              .filter((metadataKey) => !importedMetadataKeys.has(metadataKey))
              .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey));

    return {
        rowsToUpsert: rowsToUpsert.sort((leftRow, rightRow) => leftRow.key.localeCompare(rightRow.key)),
        defaultKeysToReset,
    };
}

/**
 * Loads all persisted metadata rows from the current server database.
 *
 * @returns Metadata rows sorted by key.
 */
async function loadMetadataConfigurationRows(): Promise<Array<MetadataConfigurationRow>> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('Metadata');
    const { data, error } = await supabase.from(tableName).select('key, value, note').order('key');

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to load metadata configuration.

                ${error.message}
            `),
        );
    }

    return ((data ?? []) as Array<MetadataConfigurationRow>).sort((leftRow, rightRow) =>
        leftRow.key.localeCompare(rightRow.key),
    );
}

/**
 * Creates one export entry while omitting fields that match defaults.
 *
 * @param metadataRow - Persisted metadata row.
 * @returns Export entry or `null` when both value and note are default.
 */
function createMetadataConfigurationExportEntry(
    metadataRow: MetadataConfigurationRow,
): MetadataConfigurationExportEntry | null {
    const metadataDefinition = getMetadataDefinition(metadataRow.key);
    const defaultNote = metadataDefinition?.note ?? null;
    const isValueDefault = Boolean(metadataDefinition) && metadataRow.value === metadataDefinition!.value;
    const isNoteDefault = metadataRow.note === defaultNote;
    const exportEntry: MetadataConfigurationExportEntry = {
        key: metadataRow.key,
    };

    if (!isValueDefault) {
        (exportEntry as { value: string }).value = metadataRow.value;
    }

    if (!isNoteDefault) {
        (exportEntry as { note: string | null }).note = metadataRow.note;
    }

    const isValueExported = Object.prototype.hasOwnProperty.call(exportEntry, 'value');
    const isNoteExported = Object.prototype.hasOwnProperty.call(exportEntry, 'note');

    if (!isValueExported && !isNoteExported) {
        return null;
    }

    return exportEntry;
}

/**
 * Normalizes one metadata import entry.
 *
 * @param rawMetadataEntry - Untrusted entry from the import JSON.
 * @param index - Zero-based entry index for error messages.
 * @param importedMetadataKeys - Mutable set used to reject duplicates and compute resets.
 * @returns Metadata row ready for persistence.
 */
function normalizeMetadataConfigurationImportEntry(
    rawMetadataEntry: unknown,
    index: number,
    importedMetadataKeys: Set<string>,
): MetadataConfigurationImportRow {
    if (!rawMetadataEntry || typeof rawMetadataEntry !== 'object') {
        throw new ParseError(`Metadata entry #${index + 1} must be an object.`);
    }

    const rawMetadataEntryRecord = rawMetadataEntry as Record<string, unknown>;
    const rawKey = rawMetadataEntryRecord.key;
    if (typeof rawKey !== 'string' || rawKey.trim() === '') {
        throw new ParseError(`Metadata entry #${index + 1} is missing a non-empty \`key\`.`);
    }

    const key = rawKey.trim();
    const isDuplicateKey = importedMetadataKeys.has(key);
    if (isDuplicateKey) {
        throw new ParseError(`Metadata import contains duplicate key \`${key}\`.`);
    }
    importedMetadataKeys.add(key);

    const metadataDefinition = getMetadataDefinition(key);
    const isValueProvided = Object.prototype.hasOwnProperty.call(rawMetadataEntryRecord, 'value');
    const isNoteProvided = Object.prototype.hasOwnProperty.call(rawMetadataEntryRecord, 'note');

    if (isValueProvided && typeof rawMetadataEntryRecord.value !== 'string') {
        throw new ParseError(`Metadata entry \`${key}\` has invalid \`value\`; expected a string.`);
    }

    if (isNoteProvided && typeof rawMetadataEntryRecord.note !== 'string' && rawMetadataEntryRecord.note !== null) {
        throw new ParseError(`Metadata entry \`${key}\` has invalid \`note\`; expected a string or null.`);
    }

    if (!isValueProvided && !metadataDefinition) {
        throw new ParseError(
            spaceTrim(`
                Metadata entry \`${key}\` is missing \`value\`.

                Only built-in metadata keys can omit default values.
            `),
        );
    }

    const value = isValueProvided ? (rawMetadataEntryRecord.value as string) : metadataDefinition!.value;
    const note = isNoteProvided ? (rawMetadataEntryRecord.note as string | null) : metadataDefinition?.note ?? null;
    const validationError = validateMetadataValue(key, value);

    if (validationError) {
        throw new ParseError(validationError);
    }

    return {
        key,
        value,
        note,
    };
}

/**
 * Resolves server name for the export filename from persisted metadata or defaults.
 *
 * @param metadataRows - Persisted metadata rows.
 * @returns Server name candidate.
 */
function resolveServerNameFromMetadataRows(metadataRows: ReadonlyArray<MetadataConfigurationRow>): string {
    const metadataRow = metadataRows.find((candidateRow) => candidateRow.key === SERVER_NAME_METADATA_KEY);
    const defaultServerName =
        getMetadataDefinition(SERVER_NAME_METADATA_KEY)?.value ?? DEFAULT_METADATA_EXPORT_FILENAME_STEM;

    return metadataRow?.value.trim() || defaultServerName;
}
