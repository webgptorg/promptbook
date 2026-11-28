import JSZip from 'jszip';
import { loadTableRows, type ServerBackupContext } from './serverBackupContext';

/**
 * Filename used for the flattened metadata and limits export.
 *
 * @private constant of `createServerBackupZipStream`
 */
const METADATA_AND_LIMITS_FILENAME = 'metadata-and-limits.json';

/**
 * Writes the flattened metadata and limits file.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the metadata section.
 * @param context - Shared backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendMetadataBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [metadataRows, serverLimitRows] = await Promise.all([
        loadTableRows(context.supabase, 'Metadata'),
        loadTableRows(context.supabase, 'ServerLimit'),
    ]);

    const keyValueEntries = [
        ...metadataRows.map((row) => [row.key, row.value] as const),
        ...serverLimitRows.map((row) => [row.key, row.value] as const),
    ].sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    zip.file(
        `${sectionRootPath}/${METADATA_AND_LIMITS_FILENAME}`,
        `${JSON.stringify(Object.fromEntries(keyValueEntries), null, 2)}\n`,
    );
}
