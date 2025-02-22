import { readFileSync } from 'fs';
import { join } from 'path';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../../pipeline/PipelineString';
import { validatePipelineString } from '../../pipeline/validatePipelineString';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { string_filename } from '../../types/typeAliases';
import type { string_json } from '../../types/typeAliases';

/**
 * Import the pipeline.book or pipeline.bookc file
 *
 * Note: Using here custom import to work in jest tests
 * Note: Using sync version is 💩 in the production code, but it's ok here in tests
 *
 * @param path - The path to the file relative to examples/pipelines directory
 * @private internal function of tests
 */
export function importPipelineWithoutPreparation(path: `${string}.book`): PipelineString;
export function importPipelineWithoutPreparation(path: `${string}.bookc`): PipelineJson;
export function importPipelineWithoutPreparation(path: string_filename): PipelineString | PipelineJson {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config
    const content = readFileSync(join(__dirname, examplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    if (path.endsWith('.bookc')) {
        let pipeline = JSON.parse(content) as PipelineJson;
        pipeline = unpreparePipeline(pipeline);
        return pipeline;
    } else if (path.endsWith('.book')) {
        return validatePipelineString(content);
    } else {
        throw new Error('This should be used only for .book.md or .bookc files');
    }
}

/**
 * Import the pipeline.bookc file as parsed JSON
 *
 * @private internal function of tests
 */
export function importPipelineJson(path: `${string}.bookc`): PipelineJson {
    const content = importPipelineJsonAsString(path);
    const pipeline = JSON.parse(content) as PipelineJson;
    return pipeline;
}

/**
 * Import the pipeline.bookc file as string
 *
 * @private internal function of tests
 */
export function importPipelineJsonAsString(path: `${string}.bookc`): string_json<PipelineJson> {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config
    const content = readFileSync(join(__dirname, examplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    return content as string_json<PipelineJson>;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [⚫] Code in this file should never be published in any package
 */
