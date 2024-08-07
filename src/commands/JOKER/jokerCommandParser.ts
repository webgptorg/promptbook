import { ParsingError } from '../../errors/ParsingError';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { JokerCommand } from './JokerCommand';

/**
 * Parses the joker command
 *
 * @see ./JOKER-README.md for more details
 * @private within the commands folder
 */
export const jokerCommandParser: CommandParser<JokerCommand> = {
    /**
     * Name of the command
     */
    name: 'JOKER',

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_TEMPLATE'],

    /**
     * Description of the JOKER command
     */
    description: `Joker parameter is used instead of executing the prompt template if it meet the expectations requirements`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/66',

    /**
     * Example usages of the JOKER command
     */
    examples: ['JOKER {documentTitle}'],

    /**
     * Parses the JOKER command
     */
    parse(input: CommandParserInput): JokerCommand {
        const { args } = input;

        const parametersMatch = (args.pop() || '').match(/^\{(?<parameterName>[a-z0-9_]+)\}$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new ParsingError(`Invalid joker`);
        }

        const { parameterName } = parametersMatch.groups as TODO_any;

        return {
            type: 'JOKER',
            parameterName,
        } satisfies JokerCommand;
    },
};
