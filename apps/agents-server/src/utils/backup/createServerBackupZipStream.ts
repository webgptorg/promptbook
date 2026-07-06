import JSZip from 'jszip';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { appendBooksBackupEntriesToZip, type BooksBackupZipStream } from './createBooksBackupZipStream';
import { appendSectionEntriesToZip } from './serverBackup/appendSectionEntriesToZip';
import { createServerBackupContext } from './serverBackup/serverBackupContext';
import { createServerBackupManifest } from './serverBackup/createServerBackupManifest';
import {
    DEFAULT_SERVER_BACKUP_SECTION_KEYS,
    SERVER_BACKUP_SECTION_DEFINITION_BY_KEY,
    normalizeServerBackupSectionKeys,
} from './serverBackupSections';

/**
 * ZIP filename prefix used for full or partial server backups.
 */
const SERVER_BACKUP_ROOT_PREFIX = 'promptbook-server-backup-';

/**
 * Builds one ZIP archive containing the selected server entities plus the books backup tree when requested.
 *
 * @param requestedSectionKeys - Logical sections requested by the admin UI. Invalid or empty selections fall back to the default full backup.
 * @returns ZIP filename and stream payload.
 */
export async function createServerBackupZipStream(
    requestedSectionKeys: ReadonlyArray<string> = DEFAULT_SERVER_BACKUP_SECTION_KEYS,
): Promise<BooksBackupZipStream> {
    const context = createServerBackupContext($provideSupabaseForServer());
    const selectedSectionKeys = normalizeServerBackupSectionKeys(requestedSectionKeys);
    const selectedSectionDefinitions = selectedSectionKeys.flatMap((sectionKey) => {
        const definition = SERVER_BACKUP_SECTION_DEFINITION_BY_KEY.get(sectionKey);
        return definition ? [definition] : [];
    });
    const generatedAt = new Date().toISOString();
    const backupRootFolderName = `${SERVER_BACKUP_ROOT_PREFIX}${generatedAt.slice(0, 10)}`;
    const zip = new JSZip();

    zip.folder(backupRootFolderName);

    const appendBooksPromise = selectedSectionDefinitions.some(({ includesBooks }) => includesBooks)
        ? appendBooksBackupEntriesToZip(zip, `${backupRootFolderName}/books`)
        : Promise.resolve();
    const appendSectionsPromise = Promise.all(
        selectedSectionDefinitions.map((sectionDefinition) =>
            appendSectionEntriesToZip({
                zip,
                backupRootFolderName,
                sectionDefinition,
                context,
            }),
        ),
    );

    await Promise.all([appendBooksPromise, appendSectionsPromise]);

    const manifest = createServerBackupManifest({
        generatedAt,
        selectedSectionKeys,
        selectedSectionDefinitions,
    });

    zip.file(`${backupRootFolderName}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

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
