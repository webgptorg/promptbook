import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { validatePipelineString } from '../pipeline/validatePipelineString';
import { appendMarkdownBlock } from './pipelineJsonToString/appendMarkdownBlock';
import { createPipelineCommands } from './pipelineJsonToString/createPipelineCommands';
import { createPipelineIntroduction } from './pipelineJsonToString/createPipelineIntroduction';
import { stringifyCommands } from './pipelineJsonToString/stringifyCommands';
import { stringifyTask } from './pipelineJsonToString/stringifyTask';

/**
 * Converts promptbook in JSON format to string format
 *
 * @deprecated TODO: [🥍][🧠] Backup original files in `PipelineJson` same as in Promptbook.studio
 * @param pipelineJson Promptbook in JSON format (.bookc)
 * @returns Promptbook in string format (.book.md)
 *
 * @public exported from `@promptbook/core`
 */
export function pipelineJsonToString(pipelineJson: PipelineJson): PipelineString {
    let pipelineString = createPipelineIntroduction(pipelineJson);
    const pipelineCommands = createPipelineCommands(pipelineJson);

    pipelineString = appendMarkdownBlock(pipelineString, stringifyCommands(pipelineCommands));

    for (const task of pipelineJson.tasks) {
        pipelineString = appendMarkdownBlock(pipelineString, stringifyTask(task));
    }

    return validatePipelineString(pipelineString);
}

// TODO: [🛋] Implement new features and commands into `pipelineJsonToString` + `taskParameterJsonToString` , use `stringifyCommand`
// TODO: [🧠] Is there a way to auto-detect missing features in pipelineJsonToString
// TODO: [🏛] Maybe make some markdown builder
// TODO: [🏛] Escape all
// TODO: [🧠] Should be in generated .book.md file GENERATOR_WARNING
