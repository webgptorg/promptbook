import JSZip from 'jszip';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { FilesystemTools } from '../../execution/FilesystemTools';
import { jsonParse } from '../../formats/json/utils/jsonParse';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_filename } from '../../types/typeAliases';
import { validatePipeline } from '../validation/validatePipeline';

/**
 * Loads the books from the archive file with `.bookc` extension
 *
 * @param filePath Path to the archive file with `.bookc` extension
 * @param fs Filesystem tools
 * @returns Pipelines loaded from the archive
 *
 * @private utility of Promptbook
 */
export async function loadArchive(
    filePath: string_filename,
    fs: FilesystemTools,
): Promise<ReadonlyArray<PipelineJson>> {
    if (!filePath.endsWith('.bookc')) {
        throw new UnexpectedError(`Archive file must have '.bookc' extension`);
    }

    const data = await fs.readFile(filePath);
    const archive = await JSZip.loadAsync(data);

    const indexFile = archive.file('index.book.json');

    if (!indexFile) {
        throw new UnexpectedError(`Archive does not contain 'index.book.json' file`);
    }

    const collectionJson = jsonParse<ReadonlyArray<PipelineJson>>(await indexFile.async('text'));

    for (const pipeline of collectionJson) {
        validatePipeline(pipeline);
    }

    return collectionJson;
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
