import JSZip from 'jszip';
import {
    createTranspiledAgentExportArtifacts,
    type CreateTranspiledAgentExportArtifactsOptions,
} from './createTranspiledAgentExportArtifacts';

/**
 * Input consumed by the transpiled-code ZIP builder.
 */
export type CreateTranspiledAgentExportZipBufferOptions = CreateTranspiledAgentExportArtifactsOptions;

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
    const { filename, exportRootFolderName, files } = await createTranspiledAgentExportArtifacts(options);
    const zip = new JSZip();

    zip.folder(exportRootFolderName);

    for (const file of files) {
        zip.file(`${exportRootFolderName}/${file.path}`, file.content);
    }

    const buffer = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    return {
        filename,
        buffer,
    };
}
