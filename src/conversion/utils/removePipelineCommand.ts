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

    return pipeline;
}
