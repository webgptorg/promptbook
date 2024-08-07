import { readFileSync } from 'fs';
import { join } from 'path';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';
import type { string_file_path } from '../../types/typeAliases';
import type { string_json } from '../../types/typeAliases';

/**
 * Import the pipeline.ptbk.md or pipeline.ptbk.json file
 *
 * Note: Using here custom import to work in jest tests
 * Note: Using sync version is 💩 in the production code, but it's ok here in tests
 *
 * @param path - The path to the file relative to samples/templates directory
 * @private
 */
export function importPipelineWithoutPreparation(path: `${string}.ptbk.md`): PipelineString;
export function importPipelineWithoutPreparation(path: `${string}.ptbk.json`): PipelineJson;
export function importPipelineWithoutPreparation(path: string_file_path): PipelineString | PipelineJson {
    const samplesDir = '../../../samples/templates';
    const content = readFileSync(join(__dirname, samplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    if (path.endsWith('.ptbk.json')) {
        let pipeline = JSON.parse(content) as PipelineJson;
        pipeline = unpreparePipeline(pipeline);
        return pipeline;
    } else if (path.endsWith('.ptbk.md')) {
        return content as PipelineString;
    } else {
        throw new Error('This should be used only for .ptbk.md or .ptbk.json files');
    }
}

/**
 * Import the pipeline.ptbk.json file as parsed JSON
 */
export function importPipelineJson(path: `${string}.ptbk.json`): PipelineJson {
    const content = importPipelineJsonAsString(path);
    const pipeline = JSON.parse(content) as PipelineJson;
    return pipeline;
}

/**
 * Import the pipeline.ptbk.json file as string
 */
export function importPipelineJsonAsString(path: `${string}.ptbk.json`): string_json<PipelineJson> {
    const samplesDir = '../../../samples/templates';
    const content = readFileSync(join(__dirname, samplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    return content as string_json<PipelineJson>;
}
