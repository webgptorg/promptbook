import JSZip from 'jszip';
import { getMetadata } from '../../database/getMetadata';
import { appendBooksBackupEntriesToZip, type BooksBackupZipStream } from '../backup/createBooksBackupZipStream';

/**
 * Metadata key used for the human-readable server name.
 */
const SERVER_NAME_METADATA_KEY = 'SERVER_NAME';

/**
 * Filename suffix used for agents-only exports.
 */
const AGENTS_EXPORT_FILENAME_SUFFIX = '.agents.zip';

/**
 * Fallback server filename stem when metadata does not provide a usable name.
 */
const DEFAULT_AGENTS_EXPORT_FILENAME_STEM = 'promptbook-agents-server';

/**
 * Pattern matching non-alphanumeric filename slug separators.
 */
const FILENAME_SLUG_SEPARATOR_PATTERN = /[^a-z0-9]+/g;

/**
 * Pattern matching leading or trailing filename slug separators.
 */
const FILENAME_SLUG_EDGE_SEPARATOR_PATTERN = /^-+|-+$/g;

/**
 * Builds a ZIP stream containing only agent books organized by folder structure.
 *
 * @returns Download filename and stream payload.
 */
export async function createAgentsExportZipStream(): Promise<BooksBackupZipStream> {
    const serverName = await getMetadata(SERVER_NAME_METADATA_KEY);
    const zip = new JSZip();

    await appendBooksBackupEntriesToZip(zip, '');

    const stream = zip.generateNodeStream({
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    return {
        filename: `${createAgentsExportFilenameStem(serverName)}${AGENTS_EXPORT_FILENAME_SUFFIX}`,
        stream,
    };
}

/**
 * Creates a safe lowercase filename stem from server metadata.
 *
 * @param serverName - Raw server name from metadata.
 * @returns Filename stem for the agents export.
 */
export function createAgentsExportFilenameStem(serverName: string | null | undefined): string {
    const normalizedServerName = typeof serverName === 'string' ? serverName.trim().toLowerCase() : '';
    const filenameStem = normalizedServerName
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(FILENAME_SLUG_SEPARATOR_PATTERN, '-')
        .replace(FILENAME_SLUG_EDGE_SEPARATOR_PATTERN, '');

    return filenameStem || DEFAULT_AGENTS_EXPORT_FILENAME_STEM;
}
