import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { PromptbookVersionCommand } from './PromptbookVersionCommand';

/**
 * Parses the PROMPTBOOK_VERSION command
 *
 * @see ./PROMPTBOOK_VERSION-README.md for more details
 * @private within the commands folder
 */
export const promptbookVersionCommandParser: CommandParser<PromptbookVersionCommand> = {
    /**
     * Name of the command
     */
    name: 'PROMPTBOOK_VERSION',

    /**
     * Aliases for the PROMPTBOOK_VERSION command
     */
    aliases: ['BP'],

    /**
     * Description of the PROMPTBOOK_VERSION command
     */
    description: `@@`,

    /**
     * Example usages of the PROMPTBOOK_VERSION command
     */
    examples: ['PROMPTBOOK_VERSION foo', 'PROMPTBOOK_VERSION bar', 'BP foo', 'BP bar'],

    /**
     * Parses the PROMPTBOOK_VERSION command
     */
    parse(input: CommandParserInput): PromptbookVersionCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`PROMPTBOOK_VERSION command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`PROMPTBOOK_VERSION value can not contain brr`);
        }

        return {
            type: 'PROMPTBOOK_VERSION',
            value,
        } satisfies PromptbookVersionCommand;
    },
};
