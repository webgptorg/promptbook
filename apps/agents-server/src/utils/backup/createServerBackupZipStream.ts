import JSZip from 'jszip';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { appendBooksBackupEntriesToZip, type BooksBackupZipStream } from './createBooksBackupZipStream';
import {
    ALL_SERVER_BACKUP_SECTION_KEYS,
    SERVER_BACKUP_SECTION_DEFINITION_BY_KEY,
    type ServerBackupSectionKey,
    normalizeServerBackupSectionKeys,
} from './serverBackupSections';

/**
 * ZIP filename prefix used for full or partial server backups.
 */
const SERVER_BACKUP_ROOT_PREFIX = 'promptbook-server-backup-';

/**
 * JSON payload persisted for each exported table file.
 */
type BackupTableFilePayload = {
    /**
     * Logical entity name from the generated schema types.
     */
    readonly entity: keyof AgentsServerDatabase['public']['Tables'];
    /**
     * Physical table name used by the current server installation.
     */
    readonly databaseTable: string;
    /**
     * Total number of exported rows.
     */
    readonly rowCount: number;
    /**
     * Ordered snapshot rows.
     */
    readonly rows: ReadonlyArray<Record<string, unknown>>;
};

/**
 * High-level manifest written into every server backup ZIP.
 */
type ServerBackupManifest = {
    /**
     * Stable backup archive format identifier.
     */
    readonly format: 'promptbook-server-backup/v1';
    /**
     * ISO timestamp when the archive was generated.
     */
    readonly generatedAt: string;
    /**
     * Whether the archive includes every currently supported section.
     */
    readonly isFullBackup: boolean;
    /**
     * Ordered list of exported section keys.
     */
    readonly selectedSections: ReadonlyArray<ServerBackupSectionKey>;
    /**
     * Human-readable section details for restore/debug tooling.
     */
    readonly sections: ReadonlyArray<{
        readonly key: ServerBackupSectionKey;
        readonly label: string;
        readonly directoryName: string;
        readonly tables: ReadonlyArray<keyof AgentsServerDatabase['public']['Tables']>;
        readonly includesBooks: boolean;
    }>;
};

/**
 * Builds one ZIP archive containing the selected server entities plus the books backup tree when requested.
 *
 * @param requestedSectionKeys - Logical sections requested by the admin UI. Invalid or empty selections fall back to a full backup.
 * @returns ZIP filename and stream payload.
 */
export async function createServerBackupZipStream(
    requestedSectionKeys: ReadonlyArray<string> = ALL_SERVER_BACKUP_SECTION_KEYS,
): Promise<BooksBackupZipStream> {
    const supabase = $provideSupabaseForServer();
    const selectedSectionKeys = normalizeServerBackupSectionKeys(requestedSectionKeys);
    const selectedSectionDefinitions = selectedSectionKeys.flatMap((sectionKey) => {
        const definition = SERVER_BACKUP_SECTION_DEFINITION_BY_KEY.get(sectionKey);
        return definition ? [definition] : [];
    });
    const generatedAt = new Date().toISOString();
    const backupRootFolderName = `${SERVER_BACKUP_ROOT_PREFIX}${generatedAt.slice(0, 10)}`;
    const zip = new JSZip();

    zip.folder(backupRootFolderName);

    const selectedTableKeys = Array.from(
        new Set(selectedSectionDefinitions.flatMap(({ tables }) => tables)),
    ) as Array<keyof AgentsServerDatabase['public']['Tables']>;
    const tablePayloadsByTableKey = new Map<keyof AgentsServerDatabase['public']['Tables'], BackupTableFilePayload>();

    const loadTablePayloadsPromise = Promise.all(
        selectedTableKeys.map(async (tableKey) => {
            const tablePayload = await loadBackupTableFilePayload(supabase, tableKey);
            tablePayloadsByTableKey.set(tableKey, tablePayload);
        }),
    );
    const appendBooksPromise = selectedSectionDefinitions.some(({ includesBooks }) => includesBooks)
        ? appendBooksBackupEntriesToZip(zip, `${backupRootFolderName}/books`)
        : Promise.resolve();

    await Promise.all([loadTablePayloadsPromise, appendBooksPromise]);

    const manifest: ServerBackupManifest = {
        format: 'promptbook-server-backup/v1',
        generatedAt,
        isFullBackup: selectedSectionKeys.length === ALL_SERVER_BACKUP_SECTION_KEYS.length,
        selectedSections: selectedSectionKeys,
        sections: selectedSectionDefinitions.map(({ key, label, directoryName, tables, includesBooks }) => ({
            key,
            label,
            directoryName,
            tables,
            includesBooks,
        })),
    };

    zip.file(`${backupRootFolderName}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

    for (const sectionDefinition of selectedSectionDefinitions) {
        const sectionRootPath = `${backupRootFolderName}/data/${sectionDefinition.directoryName}`;
        zip.folder(sectionRootPath);

        for (const tableKey of sectionDefinition.tables) {
            const tablePayload = tablePayloadsByTableKey.get(tableKey);

            if (!tablePayload) {
                throw new Error(`Missing backup payload for table ${tableKey}.`);
            }

            zip.file(`${sectionRootPath}/${tableKey}.json`, `${JSON.stringify(tablePayload, null, 2)}\n`);
        }
    }

    const stream = zip.generateNodeStream({
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    return {
        filename: `${backupRootFolderName}.zip`,
        stream,
    };
}

/**
 * Reads one logical table and converts it into a deterministic JSON backup payload.
 *
 * @param tableKey - Logical table key from the generated schema.
 * @returns Serializable table payload for the archive.
 */
async function loadBackupTableFilePayload(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
    tableKey: keyof AgentsServerDatabase['public']['Tables'],
): Promise<BackupTableFilePayload> {
    const tableName = await $getTableName(tableKey);
    const result = await supabase.from(tableName).select('*');

    if (result.error) {
        throw new Error(`Unable to load backup table ${tableKey}: ${result.error.message}`);
    }

    const rows = sortBackupRows(((result.data || []) as Array<Record<string, unknown>>).map((row) => ({ ...row })));

    return {
        entity: tableKey,
        databaseTable: tableName,
        rowCount: rows.length,
        rows,
    };
}

/**
 * Sorts exported rows so JSON files remain stable and easier to diff.
 *
 * @param rows - Raw table rows fetched from Supabase.
 * @returns Sorted shallow-cloned row list.
 */
function sortBackupRows(rows: ReadonlyArray<Record<string, unknown>>): Array<Record<string, unknown>> {
    return [...rows].sort(compareBackupRows);
}

/**
 * Compares two generic backup rows using the most common stable identifier fields.
 *
 * @param left - First row.
 * @param right - Second row.
 * @returns Stable ordering for backup JSON output.
 */
function compareBackupRows(left: Record<string, unknown>, right: Record<string, unknown>): number {
    const comparableKeys = ['id', 'key', 'username', 'agentName', 'permanentId', 'messageHash', 'createdAt'];

    for (const comparableKey of comparableKeys) {
        const comparison = compareComparableValues(left[comparableKey], right[comparableKey]);

        if (comparison !== 0) {
            return comparison;
        }
    }

    return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

/**
 * Compares one optional pair of identifier values.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Comparison result compatible with `Array.sort`.
 */
function compareComparableValues(left: unknown, right: unknown): number {
    if (left === right) {
        return 0;
    }

    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }

    if (left === undefined || left === null) {
        return 1;
    }

    if (right === undefined || right === null) {
        return -1;
    }

    return String(left).localeCompare(String(right));
}
