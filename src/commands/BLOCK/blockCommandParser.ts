import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { knowledgeCommandParser } from '../KNOWLEDGE/knowledgeCommandParser';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { $TemplateJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { BlockCommand } from './BlockCommand';
import { BlockTypes } from './BlockTypes';

/**
 * Parses the block command
 *
 * @see ./BLOCK-README.md for more details
 * @private within the commands folder
 */
export const blockCommandParser: PipelineTemplateCommandParser<BlockCommand> = {
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
        'SCRIPT_TEMPLATE',
        'DIALOG_TEMPLATE',
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
        // Recommended form:
        'PROMPT BLOCK',
        'SIMPLE BLOCK',
        'SCRIPT BLOCK',
        'DIALOG BLOCK',
        // <- [🅱]

        // Long form:
        'PROMPT TEMPLATE BLOCK',
        'SIMPLE TEMPLATE BLOCK',
        'SCRIPT TEMPLATE BLOCK',
        'DIALOG TEMPLATE BLOCK',
        // <- [🅱]

        // Reversed form:
        'BLOCK PROMPT TEMPLATE',
        'BLOCK SIMPLE TEMPLATE',
        'BLOCK SCRIPT TEMPLATE',
        'BLOCK DIALOG TEMPLATE',
        // <- [🅱]

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
        const blockTypes = BlockTypes.filter((blockType) => normalized.includes(blockType.split('_TEMPLATE').join('')));

        if (blockTypes.length !== 1) {
            throw new ParseError(
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
    $applyToTemplateJson(command: BlockCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        // TODO: !!!!!! Test multiple / no block type
        if ($templateJson.isBlockTypeSet === true) {
            throw new ParseError(
                spaceTrim(`
                    Block type is already defined in the template.
                    It can be defined only once.
                `),
            );
        }

        $templateJson.isBlockTypeSet = true;

        // TODO: !!!!!! Rearrange better - but at bottom and unwrap from function
        const expectResultingParameterName = () => {
            if ($templateJson.resultingParameterName) {
                return;
            }

            throw new ParseError(` Template section must end with -> {parameterName}`);
        };

        if ($templateJson.content === undefined) {
            throw new UnexpectedError(
                `Content is missing in the templateJson - probbably commands are applied in wrong order`,
                //     <- TODO: !!!!!! Make sample pipeline that have commands in wrong order
            );
        }

        if (command.blockType === 'SAMPLE') {
            expectResultingParameterName();

            const parameter = $pipelineJson.parameters.find(
                (param) => param.name === $templateJson.resultingParameterName,
            );
            if (parameter === undefined) {
                throw new ParseError(
                    `Can not find parameter {${$templateJson.resultingParameterName}} to assign sample value on it`,
                );
            }
            parameter.sampleValues = parameter.sampleValues || [];
            parameter.sampleValues.push($templateJson.content);


            $templateJson.isTemplateBlock = false;
            return;
        }

        if (command.blockType === 'KNOWLEDGE') {
            knowledgeCommandParser.$applyToPipelineJson(
                {
                    type: 'KNOWLEDGE',
                    sourceContent: $templateJson.content, // <- TODO: [🐝] !!! Work with KNOWLEDGE which not referring to the source file or website, but its content itself
                },
                $pipelineJson,
            );

            $templateJson.isTemplateBlock = false;
            return;
        }

        if (command.blockType === 'ACTION') {
            console.error(new NotYetImplementedError('Actions are not implemented yet'));

            $templateJson.isTemplateBlock = false;
            return;
        }

        if (command.blockType === 'INSTRUMENT') {
            console.error(new NotYetImplementedError('Instruments are not implemented yet'));


            $templateJson.isTemplateBlock = false;
            return;
        }

        expectResultingParameterName();
        ($templateJson as WritableDeep<TemplateJson>).blockType = command.blockType;

        /*
        TODO: !!!!!! Chat model variant should be applied in `createPipelineExecutor`
        if (command.blockType ==='PROMPT_TEMPLATE' && templateModelRequirements.modelVariant === undefined) {
          templateModelRequirements.modelVariant = 'CHAT';
        }
        */


        $templateJson.isTemplateBlock = true;
    },

    /**
     * Converts the BLOCK command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: BlockCommand): string_markdown_text {
        keepUnused(command);
        return `!!!!!!`;
    },

    /**
     * Reads the BLOCK command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<BlockCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
