import JSZip from 'jszip';
import type { string_book, string_script } from '@promptbook-local/types';
import { sanitizeBackupPathSegment } from '../backup/sanitizeBackupPathSegment';
import { getTranspiledCodeFileMetadata } from './getTranspiledCodeFileMetadata';

/**
 * Stable filename used for the bundled source book.
 */
const AGENT_SOURCE_EXPORT_FILENAME = 'agent.book';

/**
 * Stable filename used for export metadata bundled into the ZIP archive.
 */
const EXPORT_MANIFEST_FILENAME = 'manifest.json';

/**
 * Prefix used for download filenames and ZIP root folders.
 */
const EXPORT_ARCHIVE_PREFIX = 'promptbook-agent-export';

/**
 * Fallback path segment when the agent name sanitizes to an empty value.
 */
const DEFAULT_AGENT_EXPORT_SEGMENT = 'agent';

/**
 * Fallback path segment when the transpiler name sanitizes to an empty value.
 */
const DEFAULT_TRANSPILER_EXPORT_SEGMENT = 'transpiler';

/**
 * Input consumed by the transpiled-code ZIP builder.
 */
export type CreateTranspiledAgentExportZipBufferOptions = {
    /**
     * Human-facing agent name used for filenames and manifest metadata.
     */
    readonly agentName: string;

    /**
     * Stored source book bundled into the archive.
     */
    readonly agentSource: string_book;

    /**
     * Generated harness content bundled into the archive.
     */
    readonly transpiledCode: string_script;

    /**
     * Machine identifier of the selected transpiler.
     */
    readonly transpilerName: string;

    /**
     * Human-facing title of the selected transpiler.
     */
    readonly transpilerTitle: string;
};

/**
 * Output payload returned by the transpiled-code ZIP builder.
 */
export type TranspiledAgentExportZipBuffer = {
    /**
     * Suggested archive filename for the browser download.
     */
    readonly filename: string;

    /**
     * ZIP archive bytes ready for an HTTP response.
     */
    readonly buffer: Uint8Array;
};

/**
 * Builds one download-ready ZIP archive containing the stored source book, generated harness,
 * and a small manifest describing the export.
 *
 * @param options - Agent and transpiler data to include in the archive.
 * @returns ZIP filename and in-memory archive bytes.
 */
export async function createTranspiledAgentExportZipBuffer(
    options: CreateTranspiledAgentExportZipBufferOptions,
): Promise<TranspiledAgentExportZipBuffer> {
    const { agentName, agentSource, transpiledCode, transpilerName, transpilerTitle } = options;
    const { filename: transpiledCodeFilename } = getTranspiledCodeFileMetadata(transpilerName);
    const safeAgentSegment = sanitizeBackupPathSegment(agentName, DEFAULT_AGENT_EXPORT_SEGMENT);
    const safeTranspilerSegment = sanitizeBackupPathSegment(transpilerName, DEFAULT_TRANSPILER_EXPORT_SEGMENT);
    const exportRootFolderName = `${EXPORT_ARCHIVE_PREFIX}-${safeAgentSegment}-${safeTranspilerSegment}`;
    const zip = new JSZip();

    zip.folder(exportRootFolderName);
    zip.file(`${exportRootFolderName}/${AGENT_SOURCE_EXPORT_FILENAME}`, agentSource);
    zip.file(`${exportRootFolderName}/${transpiledCodeFilename}`, transpiledCode);
    zip.file(
        `${exportRootFolderName}/${EXPORT_MANIFEST_FILENAME}`,
        `${JSON.stringify(
            {
                agentName,
                transpilerName,
                transpilerTitle,
                files: [AGENT_SOURCE_EXPORT_FILENAME, transpiledCodeFilename],
            },
            null,
            2,
        )}\n`,
    );

    const buffer = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    return {
        filename: `${exportRootFolderName}.zip`,
        buffer,
    };
}
