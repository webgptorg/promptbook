import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { KnowledgeCommand } from './KnowledgeCommand';

/**
 * Parses the knowledge command
 *
 * @see ./KNOWLEDGE-README.md for more details
 * @private within the commands folder
 */
export const knowledgeCommandParser: CommandParser<KnowledgeCommand> = {
    /**
     * Name of the command
     */
    name: 'KNOWLEDGE',

    /**
     * Aliases for the KNOWLEDGE command
     */
    aliases: ['BP'],

    /**
     * Description of the KNOWLEDGE command
     */
    description: `@@`,

    /**
     * Example usages of the KNOWLEDGE command
     */
    examples: ['KNOWLEDGE foo', 'KNOWLEDGE bar', 'BP foo', 'BP bar'],

    /**
     * Parses the KNOWLEDGE command
     */
    parse(input: CommandParserInput): KnowledgeCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`KNOWLEDGE command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`KNOWLEDGE value can not contain brr`);
        }

        return {
            type: 'KNOWLEDGE',
            value,
        } satisfies KnowledgeCommand;
    },
};
