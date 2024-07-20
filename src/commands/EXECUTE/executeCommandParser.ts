import spaceTrim from 'spacetrim';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { ExecuteCommand } from './ExecuteCommand';
import { ExecutionTypes } from './ExecutionTypes';

/**
 * Parses the execute command
 *
 * @see ./EXECUTE-README.md for more details
 * @private within the commands folder
 */
export const executeCommandParser: CommandParser<ExecuteCommand> = {
    /**
     * Name of the command
     */
    name: 'EXECUTE',

    /**
     * Aliases for the EXECUTE command
     */
    aliases: ['EXEC', 'PROMPT_DIALOG', 'SIMPLE_TEMPLATE'],

    /**
     * Description of the EXECUTE command
     */
    description: `What should the template do`,

    /**
     * Example usages of the EXECUTE command
     */
    examples: ['EXECUTE SIMPLE TEMPLATE', 'EXECUTE PROMPT TEMPLATE' /* <- TODO: More */],

    /**
     * Parses the EXECUTE command
     */
    parse(input: CommandParserInput): ExecuteCommand {
        const { normalized } = input;

        const executionTypes = ExecutionTypes.filter((executionType) => normalized.includes(executionType));

        if (executionTypes.length !== 1) {
            // console.log('!!!', { executionType });
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                        Unknown execution type in EXECUTION command

                        Supported execution types are:
                        ${block(ExecutionTypes.join(', '))}
                    `,
                ),
            );
        }

        // TODO: !!!! Not supported yet

        return {
            type: 'EXECUTE',
            executionType: executionTypes[0]!,
        } satisfies ExecuteCommand;
    },
};
