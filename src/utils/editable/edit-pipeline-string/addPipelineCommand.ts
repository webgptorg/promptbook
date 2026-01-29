import spaceTrim from 'spacetrim';
import type { PipelineString } from '../../../pipeline/PipelineString';
import type { string_markdown_text } from '../../../types/typeAliases';
import { deflatePipeline } from './deflatePipeline';

type AddPipelineCommandOptions = {
    commandString: string_markdown_text;
    pipelineString: PipelineString;
};

/**
 * Adds a new command to a pipeline string in the correct format.
 *
 * @public exported from `@promptbook/editable`
 */
export function addPipelineCommand(options: AddPipelineCommandOptions): PipelineString {
    const { commandString, pipelineString } = options;

    const deflatedPipelineString = deflatePipeline(pipelineString);

    const lines = deflatedPipelineString.split(/\r?\n/);
    const newLines: Array<string> = [];
    let isCommandAdded = false;

    for (const line of lines) {
        // Add command before second (or more) heading
        if (!isCommandAdded && line.startsWith('##')) {
            newLines.push(`-   ${commandString}`);
            newLines.push('');
            isCommandAdded = true;
        }

        newLines.push(line);
    }

    if (!isCommandAdded) {
        // Note: Only situation when this should happen is when pipeline has no tasks

        if ((newLines[newLines.length - 1] || '').startsWith('#')) {
            newLines.push('');
        }
        newLines.push(`-   ${commandString}`);

        /*
        TODO: [🧠] Is this error relevant:
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Can not add command to pipeline because there is no second heading in the pipeline

                    This should never happen because pipeline is deflated before adding command

                    The command to add:
                    ${block(commandString)}

                    ---
                    The original pipeline:
                    ${block(pipelineString)}

                    ---
                    Deflated pipeline:
                    ${block(deflatedPipelineString)}

                    ---
                `,
            ),
        );
        */
    }

    return spaceTrim(newLines.join('\n')) as PipelineString;
}

/**
 * TODO: [🧠] What is the better solution - `- xxx`, - `-   xxx` or preserve (see also next TODO)
 * TODO: When existing commands 1) as 2) number 3) list, add 4) new command as next number
 */
