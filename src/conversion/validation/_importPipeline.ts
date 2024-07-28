import { readFileSync } from 'fs';
import { join } from 'path';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../../types/PipelineString';
import type { string_file_path } from '../../types/typeAliases';
import type { really_any } from '../../utils/organization/really_any';

/**
 * Import the text file
 *
 * Note: Using here custom import to work in jest tests
 * Note: Using sync version is 💩 in the production code, but it's ok here in tests
 *
 * @param path - The path to the file relative to samples/templates directory
 * @private
 */
export function importPipeline(path: `${string}.ptbk.md`): PipelineString;
export function importPipeline(path: `${string}.ptbk.json`): PipelineJson;
export function importPipeline(path: string_file_path): PipelineString | PipelineJson {
    const samplesDir = '../../../samples/templates';
    const content = readFileSync(join(__dirname, samplesDir, path), 'utf-8');
    //                         <- Note: In production it is not good practice to use synchronous functions
    //                                  But this is only a test before the build, so it is okay
    if (path.endsWith('.ptbk.json')) {
        const pipeline = JSON.parse(content) as PipelineJson;
        (pipeline as really_any).knowledge = []; // <- TODO: [🌱] Test with knowledge when seeding implemented
        return pipeline;
    } else if (path.endsWith('.ptbk.md')) {
        return content as PipelineString;
    } else {
        throw new Error('This should be used only for .ptbk.md or .ptbk.json files');
    }
}
