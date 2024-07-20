import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { UrlCommand } from './UrlCommand';

/**
 * Parses the url command
 *
 * @see ./URL-README.md for more details
 * @private within the commands folder
 */
export const urlCommandParser: CommandParser<UrlCommand> = {
    /**
     * Name of the command
     */
    name: 'URL',

    /**
     * Aliases for the URL command
     */
    aliases: ['BP'],

    /**
     * Description of the URL command
     */
    description: `@@`,

    /**
     * Example usages of the URL command
     */
    examples: ['URL foo', 'URL bar', 'BP foo', 'BP bar'],

    /**
     * Parses the URL command
     */
    parse(input: CommandParserInput): UrlCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`URL command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`URL value can not contain brr`);
        }

        return {
            type: 'URL',
            value,
        } satisfies UrlCommand;
    },
};
