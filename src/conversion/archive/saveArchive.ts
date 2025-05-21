import JSZip from 'jszip';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { FilesystemTools } from '../../execution/FilesystemTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_filename } from '../../types/typeAliases';
import { stringifyPipelineJson } from '../../utils/editable/utils/stringifyPipelineJson';
import { validatePipeline } from '../validation/validatePipeline';

/**
 * Saves the given books into an archive file with `.bookc` extension
 *
 * @param filePath Path to the archive file with `.bookc` extension
 * @param books Pipelines to be saved in the archive
 * @param fs Filesystem tools
 *
 * @private utility of Promptbook
 */
export async function saveArchive(
    filePath: string_filename,
    collectionJson: ReadonlyArray<PipelineJson>,
    fs: FilesystemTools,
): Promise<void> {
    if (!filePath.endsWith('.bookc')) {
        throw new UnexpectedError(`Archive file must have '.bookc' extension`);
    }

    // Note: We want to ensure that the generated JSONs are logically correct
    for (const pipelineJson of collectionJson) {
        validatePipeline(pipelineJson);
    }

    const archive = new JSZip();

    const collectionJsonString = stringifyPipelineJson(collectionJson);

    archive.file('index.book.json', collectionJsonString);
    const data = await archive.generateAsync({ type: 'nodebuffer', streamFiles: true });
    await fs.writeFile(filePath, data);
}

/**
 * TODO: Add metadata to zip
 * TODO: Compression level and other zip options from config
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
