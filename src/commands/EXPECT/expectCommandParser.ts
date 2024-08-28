import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParsingError } from '../../errors/ParsingError';
import { EXPECTATION_UNITS } from '../../types/PipelineJson/Expectations';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { keepUnused } from '../../utils/organization/keepUnused';
import { parseNumber } from '../../utils/parseNumber';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { ExpectAmountCommand } from './ExpectAmountCommand';
import type { ExpectCommand } from './ExpectCommand';
import type { ExpectFormatCommand } from './ExpectFormatCommand';

/**
 * Parses the expect command
 *
 * @see ./EXPECT-README.md for more details
 * @private within the commands folder
 */
export const expectCommandParser: CommandParser<ExpectCommand> = {
    /**
     * Name of the command
     */
    name: 'EXPECT',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineTemplate: true,

    /**
     * Description of the EXPECT command
     */
    description: spaceTrim(`
        Expect command describes the desired output of the prompt template (after post-processing)
        It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs or some other shape of the output.
    `),

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/30',

    /**
     * Example usages of the EXPECT command
     */
    examples: [
        'EXPECT MIN 100 Characters',
        'EXPECT MAX 10 Words',
        'EXPECT EXACTLY 3 Sentences',
        'EXPECT EXACTLY 1 Paragraph',
        // <- TODO: 'EXPECT 1 Paragraph',
        'Expect JSON',
    ],

    /**
     * Parses the EXPECT command
     */
    parse(input: CommandParserInput): ExpectCommand {
        const { args, normalized } = input;

        if (normalized.startsWith('EXPECT_JSON')) {
            return {
                type: 'EXPECT_FORMAT',
                format: 'JSON',
            } satisfies ExpectFormatCommand;
            // <- TODO: [🦽] Why this is constantly removed by repair-imports.ts

            // [🥤]
        }

        try {
            let sign: ExpectAmountCommand['sign'];
            const signRaw = args.shift()!;
            if (/^exact/i.test(signRaw)) {
                sign = 'EXACTLY';
            } else if (/^min/i.test(signRaw)) {
                sign = 'MINIMUM';
            } else if (/^max/i.test(signRaw)) {
                sign = 'MAXIMUM';
            } else {
                throw new ParsingError(`Invalid sign "${signRaw}", expected EXACTLY, MIN or MAX`);
            }

            const amountRaw = args.shift()!;
            const amount = parseNumber(amountRaw);
            if (amount < 0) {
                throw new ParsingError('Amount must be positive number or zero');
            }
            if (amount !== Math.floor(amount)) {
                throw new ParsingError('Amount must be whole number');
            }

            const unitRaw = args.shift()!;
            let unit: ExpectAmountCommand['unit'] | undefined = undefined;
            for (const existingUnit of EXPECTATION_UNITS) {
                let existingUnitText: string = existingUnit;

                existingUnitText = existingUnitText.substring(0, existingUnitText.length - 1);
                if (existingUnitText === 'CHARACTER') {
                    existingUnitText = 'CHAR';
                }

                if (
                    new RegExp(`^${existingUnitText.toLowerCase()}`).test(unitRaw.toLowerCase()) ||
                    new RegExp(`^${unitRaw.toLowerCase()}`).test(existingUnitText.toLowerCase())
                ) {
                    if (unit !== undefined) {
                        throw new ParsingError(`Ambiguous unit "${unitRaw}"`);
                    }
                    unit = existingUnit;
                }
            }
            if (unit === undefined) {
                throw new ParsingError(`Invalid unit "${unitRaw}"`);
            }

            return {
                type: 'EXPECT_AMOUNT',
                sign,
                unit,
                amount,
            } satisfies ExpectCommand;
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            throw new ParsingError(
                spaceTrim(
                    (block) =>
                        `
                            Invalid EXPECT command
                            ${block((error as Error).message)}:
                        `,
                ),
            );
        }
    },

    /**
     * Apply the EXPECT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: ExpectCommand, pipelineJson: PipelineJson): void {
        keepUnused(command, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Apply the EXPECT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ExpectCommand, templateJson: PromptTemplateJson, pipelineJson: PipelineJson): void {
        keepUnused(command, templateJson, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Converts the EXPECT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ExpectCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the EXPECT command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<ExpectCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Reads the EXPECT command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: PromptTemplateJson): Array<ExpectCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
