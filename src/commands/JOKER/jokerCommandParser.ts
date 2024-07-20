import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { JokerCommand } from './JokerCommand';

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
     * Description of the JOKER command
     */
    description: `Joker parameter is used instead of executing the prompt template if it meet the expectations requirements`,

    /**
     * Example usages of the JOKER command
     */
    examples: ['JOKER {documentTitle}'],

    /**
     * Parses the JOKER command
     */
    parse(input: CommandParserInput): JokerCommand {
        const { items } = input;

        const parametersMatch = (items.pop() || '').match(/^\{(?<parameterName>[a-z0-9_]+)\}$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new SyntaxError(`Invalid joker`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { parameterName } = parametersMatch.groups as any;

        return {
            type: 'JOKER',
            parameterName,
        } satisfies JokerCommand;
    },
};
