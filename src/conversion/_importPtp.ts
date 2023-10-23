import { readFileSync } from 'fs';
import { join } from 'path';
import { string_file_path } from '../../../../../../utils/typeAliases';
import { PromptTemplatePipelineJson } from '../types/PromptTemplatePipelineJson/PromptTemplatePipelineJson';
import { PromptTemplatePipelineString } from '../types/PromptTemplatePipelineString';

/**
 * Import the text file
 *
 * Note: Using here custom import to work in jest tests
 * Note: Using sync version is 💩 in the production code, but it's ok here in tests
 *
 * @private
 */
export function importPtp(path: `${string}.ptp.md`): PromptTemplatePipelineString;
export function importPtp(path: `${string}.ptp.json`): PromptTemplatePipelineJson;
export function importPtp(path: string_file_path): PromptTemplatePipelineString | PromptTemplatePipelineJson {
    const content = readFileSync(join(__dirname, path), 'utf-8');
    if (path.endsWith('.ptp.json')) {
        return JSON.parse(content) as PromptTemplatePipelineJson;
    } else if (path.endsWith('.ptp.md')) {
        return content as PromptTemplatePipelineString;
    } else {
        throw new Error(`This should be used only for .ptp.md or .ptp.json files`);
    }
}
