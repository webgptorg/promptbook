import JSZip from 'jszip';
import type { ServerBackupSectionDefinition } from '../serverBackupSections';
import { appendAgentBackupEntriesToZip } from './appendAgentBackupEntriesToZip';
import { appendConversationBackupEntriesToZip } from './appendConversationBackupEntriesToZip';
import { appendFileBackupEntriesToZip } from './appendFileBackupEntriesToZip';
import { appendMessageBackupEntriesToZip } from './appendMessageBackupEntriesToZip';
import { appendMetadataBackupEntriesToZip } from './appendMetadataBackupEntriesToZip';
import { appendUserBackupEntriesToZip } from './appendUserBackupEntriesToZip';
import type { ServerBackupContext } from './serverBackupContext';

/**
 * Filename used when a requested section intentionally exports no data.
 *
 * @private constant of `createServerBackupZipStream`
 */
const EXCLUDED_SECTION_FILENAME = 'excluded.json';

/**
 * Appends one selected section into the ZIP archive.
 *
 * @param options - Section append options.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendSectionEntriesToZip(options: {
    zip: JSZip;
    backupRootFolderName: string;
    sectionDefinition: ServerBackupSectionDefinition;
    context: ServerBackupContext;
}): Promise<void> {
    const { zip, backupRootFolderName, sectionDefinition, context } = options;
    const sectionRootPath = `${backupRootFolderName}/data/${sectionDefinition.directoryName}`;
    zip.folder(sectionRootPath);

    switch (sectionDefinition.key) {
        case 'metadata':
            await appendMetadataBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'agents':
            await appendAgentBackupEntriesToZip(zip, sectionRootPath, sectionDefinition, context);
            return;
        case 'conversations':
            await appendConversationBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'users':
            await appendUserBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'files':
            await appendFileBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'messages':
            await appendMessageBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'security':
        case 'caches':
            appendExcludedSectionNoteToZip(zip, sectionRootPath, sectionDefinition);
            return;
        default: {
            const exhaustiveSectionKey: never = sectionDefinition.key;
            throw new Error(`Unsupported backup section ${String(exhaustiveSectionKey)}.`);
        }
    }
}

/**
 * Writes the explanatory note for a section that is intentionally excluded from the archive.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the excluded section.
 * @param sectionDefinition - Excluded section definition.
 *
 * @private function of `createServerBackupZipStream`
 */
function appendExcludedSectionNoteToZip(
    zip: JSZip,
    sectionRootPath: string,
    sectionDefinition: ServerBackupSectionDefinition,
): void {
    zip.file(
        `${sectionRootPath}/${EXCLUDED_SECTION_FILENAME}`,
        `${JSON.stringify(
            {
                key: sectionDefinition.key,
                label: sectionDefinition.label,
                included: false,
                reason: sectionDefinition.description,
            },
            null,
            2,
        )}\n`,
    );
}
