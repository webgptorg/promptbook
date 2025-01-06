import spaceTrim from 'spacetrim';
import { createCollectionFromDirectory } from '../collection/constructors/createCollectionFromDirectory';
import { NotFoundError } from '../errors/NotFoundError';
import { NotYetImplementedError } from '../errors/NotYetImplementedError';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import type { string_filename, string_pipeline_url } from '../types/typeAliases';
import { just } from '../utils/organization/just';
import { isValidFilePath } from '../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../utils/validators/url/isValidUrl';

/**
 * @see ./wizzard.ts `getPipeline` method
 *
 * @private usable through `ptbk run` and `@prompbook/wizzard`
 */
export async function getPipeline(
    tools: ExecutionTools,
    pipelineSource: string_filename | string_pipeline_url | PipelineString,
): Promise<PipelineJson> {
    // Strategy 1️⃣: If the pipelineSource is a filename - try to load it from the file
    if (isValidFilePath(pipelineSource)) {
        // TODO: !!!!!! Implement + use same mechanism in `ptbk run`
    } /* not else */

    // Strategy 2️⃣: If the pipelineSource is a URL - try to find the pipeline on disk in `DEFAULT_BOOKS_DIRNAME` (= `./books`) directory recursively up to the root
    if (isValidUrl(pipelineSource)) {
        // ▶ Create whole pipeline collection
        const collection = await createCollectionFromDirectory('./books', tools);
        // <- TODO: !!!!!! Search recursively in the directory

        // ▶ Get single Pipeline
        const pipeline = await (async () => {
            try {
                return await collection.getPipelineByUrl(pipelineSource);
            } catch (error) {
                if (!(error instanceof NotFoundError)) {
                    throw error;
                }

                // Note: If the pipeline was not found in the collection, try next strategy
                return null;
            }
        })();

        if (pipeline !== null) {
            return pipeline;
        }
    } /* not else */

    // Strategy 3️⃣: If the pipelineSource is a URL - try to fetch it from the internet
    if (isValidUrl(pipelineSource)) {
        throw new NotYetImplementedError(
            'Strategy 3️⃣: If the pipelineSource is a URL - try to fetch it from the internet',
        );
    } /* not else */

    // Strategy 4️⃣: If the pipelineSource is a PipelineString - try to parse it
    if (just(true) /* <- TODO: Implement, use and export `isValidPipelineString` */) {
        throw new NotYetImplementedError('Strategy 4️⃣: If the pipelineSource is a PipelineString - try to parse it');
    } /* not else */

    throw new NotFoundError(
        spaceTrim(
            (block) => `
                    No pipeline found for:
                    ${block(pipelineSource)}

                    Pipelines can be loaded from:
                    1) @@@!!!
                `,
        ),
    );
}

/**
 * TODO: Write unit test
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
