import spaceTrim from 'spacetrim';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { BlockCommand } from './BlockCommand';
import { BlockTypes } from './BlockTypes';

/**
 * Parses the block command
 *
 * @see ./BLOCK-README.md for more details
 * @private within the commands folder
 */
export const blockCommandParser: CommandParser<BlockCommand> = {
    /**
     * Name of the command
     */
    name: 'BLOCK',

    /**
     * Aliases for the BLOCK command
     */
    aliasNames: ['PROMPT_DIALOG', 'SIMPLE_TEMPLATE'],

    /**
     * Aliases for the BLOCK command
     */
    deprecatedNames: ['EXECUTE'],

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_TEMPLATE'],

    /**
     * Description of the BLOCK command
     */
    description: `What should the code block template do`,

    /**
     * Link to discussion
     */
    discussionUrl: 'https://github.com/webgptorg/promptbook/discussions/64',

    /**
     * Example usages of the BLOCK command
     */
    examples: [
        'PROMPT TEMPLATE BLOCK',
        'SIMPLE TEMPLATE BLOCK',
        'SCRIPT',
        'PROMPT_DIALOG',
        'SAMPLE',
        'KNOWLEDGE',
        'INSTRUMENT',
        'ACTION',
        /* <- TODO: [🧠] Maybe dynamic */
    ],

    /**
     * Parses the BLOCK command
     */
    parse(input: CommandParserInput): BlockCommand {
        const { normalized } = input;

        const blockTypes = BlockTypes.filter((blockType) => normalized.includes(blockType));

        if (blockTypes.length !== 1) {
            // console.log('!!!', { blockType });
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                        Unknown block type in BLOCK command

                        Supported block types are:
                        ${block(BlockTypes.join(', '))}
                    `,
                ),
            );
        }

        // TODO: !!!! Not supported yet

        return {
            type: 'BLOCK',
            blockType: blockTypes[0]!,
        } satisfies BlockCommand;
    },
};
