import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { KnowledgeCommand } from './KnowledgeCommand';

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
     * Description of the KNOWLEDGE command
     */
    description: `Tells promptbook which external knowledge to use`,

    /**
     * Example usages of the KNOWLEDGE command
     */
    examples: [
        'KNOWLEDGE https://www.pavolhejny.com/',
        'KNOWLEDGE ./hejny-cv.txt',
        'KNOWLEDGE ./hejny-cv.md',
        'KNOWLEDGE ./hejny-cv.pdf',
        'KNOWLEDGE ./hejny-cv.docx',
    ],

    /**
     * Parses the KNOWLEDGE command
     */
    parse(input: CommandParserInput): KnowledgeCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`KNOWLEDGE command requires exactly one argument`);
        }

        const source = args[0]!.toLowerCase();

        // TODO: !!! Validate that source is a valid path or URL

        return {
            type: 'KNOWLEDGE',
            source,
        } satisfies KnowledgeCommand;
    },
};
