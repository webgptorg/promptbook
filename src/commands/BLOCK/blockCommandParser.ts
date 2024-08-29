import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParsingError } from '../../errors/ParsingError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { knowledgeCommandParser } from '../KNOWLEDGE/knowledgeCommandParser';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { BlockCommand } from './BlockCommand';
import { BlockTypes } from './BlockTypes';

/**
 * Parses the block command
 *
 * @see ./BLOCK-README.md for more details
 * @private within the commands folder
 */
export const blockCommandParser = {
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
        // <- [🅱]
    ],

    /**
     * Aliases for the BLOCK command
     */
    deprecatedNames: ['EXECUTE'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the BLOCK command
     */
    description: `What should the code block template do`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/64',

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
        /* Note: Not implemented block types will be in examples in future -> */
        'Instrument BLOCK',
        // 'Instrument', // <- Note: [⛱]
        'Action BLOCK',
        // 'Action', // <- Note: [⛱]
        //---
        /* <- TODO: [🧠] Maybe dynamic */
    ],

    // TODO: [♓️] order: -10 /* <- Note: Putting before other commands */

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

        const blockType = blockTypes[0]!;

        return {
            type: 'BLOCK',
            blockType,
        } satisfies BlockCommand;
    },

    /**
     * Apply the BLOCK command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(
        command: BlockCommand,
        templateJson: WritableDeep<PromptTemplateJson>,
        pipelineJson: WritableDeep<PipelineJson>,
    ): void {
        /*
        TODO: !!!!!! Test multiple / no block type
        if (isBlockTypeSet) {
            throw new ParsingError(
                spaceTrim(
                    (block) => `
                    Block type is already defined in the prompt template. It can be defined only once.

                    ${block(getPipelineIdentification())}
                `,
                ),
                // <- TODO: [🚞]
            );
        }
        */

        if (command.blockType === 'SAMPLE') {
            // TODO: !!!!!! Test missing/extra resultingParameterName
            // expectResultingParameterName();

            const parameter = pipelineJson.parameters.find(
                (param) => param.name === templateJson.resultingParameterName,
            );
            if (parameter === undefined) {
                throw new ParsingError(
                    `Can not find parameter {${templateJson.resultingParameterName}} to assign sample value`,
                );
            }
            parameter.sampleValues = parameter.sampleValues || [];
            parameter.sampleValues.push(templateJson.content);

            // TODO: !!!!!! How to implement this?
            // continue templates;
            return;
        }

        if (command.blockType === 'KNOWLEDGE') {
            knowledgeCommandParser.$applyToTemplateJson(
                {
                    type: 'KNOWLEDGE',
                    sourceContent: templateJson.content, // <- TODO: [🐝] !!! Work with KNOWLEDGE which not referring to the source file or website, but its content itself
                },
                templateJson,
                pipelineJson,
            );
            // TODO: !!!!!! How to implement this?
            // continue templates;
            return;
        }

        if (command.blockType === 'ACTION') {
            console.error(new NotYetImplementedError('Actions are not implemented yet'));

            // TODO: !!!!!! How to implement this?
            // continue templates;
            return;
        }

        if (command.blockType === 'INSTRUMENT') {
            console.error(new NotYetImplementedError('Instruments are not implemented yet'));

            // TODO: !!!!!! How to implement this?
            // continue templates;
            return;
        }

        // !!!!!!
        // expectResultingParameterName();
        (templateJson as WritableDeep<PromptTemplateJson>).blockType = command.blockType;

        /*
        TODO: !!!!!! Chat model variant should be applied in `createPipelineExecutor`
        if (command.blockType ==='PROMPT_TEMPLATE' && templateModelRequirements.modelVariant === undefined) {
          templateModelRequirements.modelVariant = 'CHAT';
        }
        */

        // !!!!!!
        // isBlockTypeSet = true; //<- Note: [2]
    },

    /**
     * Converts the BLOCK command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: BlockCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the BLOCK command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: WritableDeep<PromptTemplateJson>): Array<BlockCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
} satisfies CommandParser<BlockCommand>;
