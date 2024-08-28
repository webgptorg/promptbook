import { ParsingError } from '../../errors/ParsingError';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { ApplyToPipelineJsonSubjects, CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { BoilerplateCommand } from './BoilerplateCommand';

/**
 * Parses the boilerplate command
 *
 * @see ./BOILERPLATE-README.md for more details
 * @private within the commands folder
 */
export const boilerplateCommandParser: CommandParser<BoilerplateCommand> = {
    /**
     * Name of the command
     */
    name: 'BOILERPLATE',

    /**
     * Aliases for the BOILERPLATE command
     */
    aliasNames: ['BP'],

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'],

    /**
     * Description of the BOILERPLATE command
     */
    description: `@@`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Example usages of the BOILERPLATE command
     */
    examples: ['BOILERPLATE foo', 'BOILERPLATE bar', 'BP foo', 'BP bar'],

    /**
     * Parses the BOILERPLATE command
     */
    parse(input: CommandParserInput): BoilerplateCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParsingError(`BOILERPLATE command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new ParsingError(`BOILERPLATE value can not contain brr`);
        }

        return {
            type: 'BOILERPLATE',
            value,
        } satisfies BoilerplateCommand;
    },

    applyToPipelineJson(command: BoilerplateCommand, subjects: ApplyToPipelineJsonSubjects): void {
        keepUnused(command, subjects);
        throw new ParsingError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file`,
        );
    },
};

/**
 * TODO: !!!!!! What is this command for? Make more descriptive annotation above each command
 * TODO: [💐] Implement BOILERPLATE command into `pipelineStringToJsonSync` function
 */
