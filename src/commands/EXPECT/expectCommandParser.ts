import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { EXPECTATION_UNITS, ExpectationUnit } from '../../types/PipelineJson/Expectations';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { parseNumber } from '../../utils/parseNumber';
import type { $TemplateJson, CommandParserInput, PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { ExpectCommand } from './ExpectCommand';

/**
 * Parses the expect command
 *
 * @see ./EXPECT-README.md for more details
 * @private within the commands folder
 */
export const expectCommandParser: PipelineTemplateCommandParser<ExpectCommand> = {
    /**
     * Name of the command
     */
    name: 'EXPECT',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the FORMAT command
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
     * Example usages of the FORMAT command
     */
    examples: [
        'EXPECT MIN 100 Characters',
        'EXPECT MAX 10 Words',
        'EXPECT EXACTLY 3 Sentences',
        'EXPECT EXACTLY 1 Paragraph',
        // <- TODO: 'EXPECT 1 Paragraph',
    ],

    /**
     * Parses the FORMAT command
     */
    parse(input: CommandParserInput): ExpectCommand {
        const { args } = input;

        try {
            let sign: ExpectCommand['sign'];
            const signRaw = args.shift()!;
            if (/^exact/i.test(signRaw)) {
                sign = 'EXACTLY';
            } else if (/^min/i.test(signRaw)) {
                sign = 'MINIMUM';
            } else if (/^max/i.test(signRaw)) {
                sign = 'MAXIMUM';
            } else {
                throw new ParseError(`Invalid sign "${signRaw}", expected EXACTLY, MIN or MAX`);
            }

            const amountRaw = args.shift()!;
            const amount = parseNumber(amountRaw);
            if (amount < 0) {
                throw new ParseError('Amount must be positive number or zero');
            }
            if (amount !== Math.floor(amount)) {
                throw new ParseError('Amount must be whole number');
            }

            const unitRaw = args.shift()!;
            let unit: ExpectCommand['unit'] | undefined = undefined;
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
                        throw new ParseError(`Ambiguous unit "${unitRaw}"`);
                    }
                    unit = existingUnit;
                }
            }
            if (unit === undefined) {
                throw new ParseError(`Invalid unit "${unitRaw}"`);
            }

            return {
                type: 'EXPECT',
                sign,
                unit,
                amount,
            } satisfies ExpectCommand;
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            throw new ParseError(
                spaceTrim(
                    (block) =>
                        `
                            Invalid FORMAT command
                            ${block((error as Error).message)}:
                        `,
                ),
            );
        }
    },

    /**
     * Apply the FORMAT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ExpectCommand, $templateJson: $TemplateJson): void {
        // eslint-disable-next-line no-case-declarations
        const unit = command.unit.toLowerCase() as Lowercase<ExpectationUnit>;

        $templateJson.expectations = $templateJson.expectations || {};
        $templateJson.expectations[unit] = $templateJson.expectations[unit] || {};

        if (command.sign === 'MINIMUM' || command.sign === 'EXACTLY') {
            if ($templateJson.expectations[unit]!.min !== undefined) {
                throw new ParseError(
                    `Already defined minumum ${
                        $templateJson.expectations![unit]!.min
                    } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                );
            }
            $templateJson.expectations[unit]!.min = command.amount;
        } /* not else */
        if (command.sign === 'MAXIMUM' || command.sign === 'EXACTLY') {
            if ($templateJson.expectations[unit]!.max !== undefined) {
                throw new ParseError(
                    `Already defined maximum ${
                        $templateJson.expectations![unit]!.max
                    } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                );
            }
            $templateJson.expectations[unit]!.max = command.amount;
        }
    },

    /**
     * Converts the FORMAT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ExpectCommand): string_markdown_text {
        keepUnused(command);
        return `!!!!!!`;
    },

    /**
     * Reads the FORMAT command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<ExpectCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
