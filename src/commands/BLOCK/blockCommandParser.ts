import spaceTrim from 'spacetrim';
import { ParsingError } from '../../errors/ParsingError';
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
    aliasNames: [
        'PROMPT_TEMPLATE',
        'SIMPLE_TEMPLATE',
        'SCRIPT',
        'PROMPT_DIALOG',
        'SAMPLE',
        'EXAMPLE',
        'KNOWLEDGE',
        'INSTRUMENT',
        'ACTION',
        // <- [🩻]
    ],

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
        'Prompt template BLOCK',
        'Prompt template',
        'Simple template BLOCK',
        'Simple template',
        'Script BLOCK',
        'Script',
        'Prompt dialog BLOCK',
        'Prompt dialog',
        'Sample BLOCK',
        'Sample',
        'Example BLOCK',
        'Example',
        'Knowledge BLOCK',
        // 'Knowledge', // <- Note: [⛱] For execution blocks which are also separate commands shortcut does not work

        //---
        /* TODO: !!!! Not implemented block types will be in examples in future -> */
        'Instrument BLOCK',
        // 'Instrument', // <- Note: [⛱]
        'Action BLOCK',
        // 'Action', // <- Note: [⛱]
        //---
        /* <- TODO: [🧠] Maybe dynamic */
    ],

    /**
     * Parses the BLOCK command
     */
    parse(input: CommandParserInput): BlockCommand {
        let { normalized } = input;

        normalized = normalized.split('EXAMPLE').join('SAMPLE');
        const blockTypes = BlockTypes.filter((blockType) => normalized.includes(blockType));

        if (blockTypes.length !== 1) {
            throw new ParsingError(
                spaceTrim(
                    (block) => `
                        Unknown block type in BLOCK command

                        Supported block types are:
                        ${block(BlockTypes.join(', '))}
                    `, // <- TODO: [🚞]
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
