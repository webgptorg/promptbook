import type { AgentModelRequirements } from '../book-2.0/agent-source/AgentModelRequirements';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { extensionToMimeType } from '../utils/files/extensionToMimeType';
import { getFileExtension } from '../utils/files/getFileExtension';
import { AgentImporter } from './file-importers/AgentImporter';
import { JsonImporter } from './file-importers/JsonImporter';
import { TextImporter } from './file-importers/TextImporter';
import type { FileImporter } from './FileImporter';
import { securityCheck } from './utils/securityCheck';

/**
 * List of available file importers
 */
const FILE_IMPORTERS: ReadonlyArray<FileImporter> = [
    AgentImporter,
    JsonImporter,
    TextImporter,
];

/**
 * Imports a file from a URL or local path
 * 
 * @param url - The URL or local path to the file
 * @param requirements - Current agent model requirements
 * @param tools - Execution tools for fetching/reading files
 * @returns The modified requirements
 */
export async function importFile(
    url: string,
    requirements: AgentModelRequirements,
    tools: Pick<ExecutionTools, 'fs' | 'scrapers'>,
): Promise<AgentModelRequirements> {
    const isUrl = url.startsWith('http://') || url.startsWith('https://');
    let content: string;
    let mimeType: string | undefined;

    if (isUrl) {
        // Fetch from URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch from URL "${url}": ${response.status} ${response.statusText}`);
        }
        content = await response.text();
        mimeType = response.headers.get('content-type')?.split(';')[0];
    } else {
        // Read from local file
        if (!tools.fs) {
            throw new Error(`Cannot import local file "${url}" because filesystem tools are not available.`);
        }
        content = await tools.fs.readFile(url, 'utf8');
        const extension = getFileExtension(url);
        mimeType = extensionToMimeType(extension || '');
    }

    // Run security check
    await securityCheck(content, url);

    // Find the right importer
    const importer = FILE_IMPORTERS.find((importer) => importer.canImport(url, mimeType));

    if (!importer) {
        throw new Error(`No importer found for file "${url}" (MIME type: ${mimeType || 'unknown'}).`);
    }

    const result = await importer.import(content, url, mimeType || 'text/plain', requirements);

    if (typeof result === 'string') {
        return {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + result,
        };
    }

    return result;
}
