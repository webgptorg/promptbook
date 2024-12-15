import spaceTrim from 'spacetrim';
import { CommandType } from '../../commands/_common/types/CommandType';
import { PipelineString } from '../../pipeline/PipelineString';

/**
 * Options for `removePipelineCommand`
 */
type RemovePipelineCommandOptions = {
    /**
     * The command you want to remove
     */
    command: CommandType;
    // <- TODO: [🧘] Use here `CommandTypeOrAlias`

    /**
     * Pipeline you want to remove command from
     */
    pipeline: PipelineString;
};

/**
 * Function `removePipelineCommand` will remove one command from pipeline string
 *
 * @public exported from `@promptbook/core` <- Note: [👖] This utility is so tightly interconnected with the Promptbook that it is not exported as util but in core
 */
export function removePipelineCommand(options: RemovePipelineCommandOptions): PipelineString {
    const { command, pipeline } = options;

    const lines = pipeline.split('\n');

    // TODO: [🧽] DRY
    let currentType: 'MARKDOWN' | 'CODE_BLOCK' | 'COMMENT' = 'MARKDOWN';

    const newLines: Array<string> = [];

    for (const line of lines) {
        if (currentType === 'MARKDOWN') {
            if (line.startsWith('```')) {
                currentType = 'CODE_BLOCK';
            } else if (line.includes('<!--')) {
                currentType = 'COMMENT';
            }
        } else if (currentType === 'CODE_BLOCK') {
            if (line.startsWith('```')) {
                currentType = 'MARKDOWN';
            }
        } else if (currentType === 'COMMENT') {
            if (line.includes('-->')) {
                currentType = 'MARKDOWN';
            }
        }

        if (currentType === 'MARKDOWN' && /^(-|\d\))/m.test(line) && line.toUpperCase().includes(command)) {
            continue;
        }

        newLines.push(line);
    }

    const newPipeline = spaceTrim(newLines.join('\n'));

    return newPipeline as PipelineString;
}
