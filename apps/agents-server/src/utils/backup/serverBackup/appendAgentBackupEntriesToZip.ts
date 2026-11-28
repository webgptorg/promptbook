import JSZip from 'jszip';
import type { ServerBackupSectionDefinition } from '../serverBackupSections';
import { loadBackupTableFilePayload, type ServerBackupContext } from './serverBackupContext';

/**
 * Writes the legacy table-backed agent export while keeping the books tree unchanged.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the agents section.
 * @param sectionDefinition - Agents section definition.
 * @param context - Shared backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendAgentBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    sectionDefinition: ServerBackupSectionDefinition,
    context: ServerBackupContext,
): Promise<void> {
    const tableKeys = sectionDefinition.tables || [];

    for (const tableKey of tableKeys) {
        const tablePayload = await loadBackupTableFilePayload(context.supabase, tableKey);
        zip.file(`${sectionRootPath}/${tableKey}.json`, `${JSON.stringify(tablePayload, null, 2)}\n`);
    }
}
