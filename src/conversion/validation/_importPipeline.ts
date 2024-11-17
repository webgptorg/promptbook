import { readFileSync } from 'fs';
import { join } from 'path';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';
import type { string_filename } from '../../types/typeAliases';
import type { string_json } from '../../types/typeAliases';

/**
 * Import the pipeline.book.md or pipeline.book.json file
 *
 * Note: Using here custom import to work in jest tests
 * Note: Using sync version is 💩 in the production code, but it's ok here in tests
 *
 * @param path - The path to the file relative to examples/pipelines directory
 * @private internal function of tests
 */
export function importPipelineWithoutPreparation(path: `${string}.book.md`): PipelineString;
export function importPipelineWithoutPreparation(path: `${string}.book.json`): PipelineJson;
export function importPipelineWithoutPreparation(path: string_filename): PipelineString | PipelineJson {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config
    const content = readFileSync(join(__dirname, examplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    if (path.endsWith('.book.json')) {
        let pipeline = JSON.parse(content) as PipelineJson;
        pipeline = unpreparePipeline(pipeline);
        return pipeline;
    } else if (path.endsWith('.book.md')) {
        return content as PipelineString;
    } else {
        throw new Error('This should be used only for .book.md or .book.json files');
    }
}

/**
 * Import the pipeline.book.json file as parsed JSON
 *
 * @private internal function of tests
 */
export function importPipelineJson(path: `${string}.book.json`): PipelineJson {
    const content = importPipelineJsonAsString(path);
    const pipeline = JSON.parse(content) as PipelineJson;
    return pipeline;
}

/**
 * Import the pipeline.book.json file as string
 *
 * @private internal function of tests
 */
export function importPipelineJsonAsString(path: `${string}.book.json`): string_json<PipelineJson> {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config
    const content = readFileSync(join(__dirname, examplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    return content as string_json<PipelineJson>;
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
