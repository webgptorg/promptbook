import spaceTrim from 'spacetrim';
import { assertsError } from '../../errors/assertsError';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { ExpectationUnit } from '../../pipeline/PipelineJson/Expectations';
import { EXPECTATION_UNITS } from '../../pipeline/PipelineJson/Expectations';
import type { string_markdown_text } from '../../types/typeAliases';
import { parseNumber } from '../../utils/misc/parseNumber';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { $TaskJson, CommandParserInput, PipelineTaskCommandParser } from '../_common/types/CommandParser';
import type { ExpectCommand } from './ExpectCommand';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
import { WrappedError } from '../../errors/WrappedError';
import { assertsError } from '../../errors/assertsError';
 * Parses the expect command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const expectCommandParser: PipelineTaskCommandParser<ExpectCommand> = {
    /**
     * Name of the command
     */
    name: 'EXPECT',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTask: true,

    /**
     * Description of the FORMAT command
     */
    description: spaceTrim(`
        Expect command describes the desired output of the task *(after post-processing)*
        It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs or some other shape of the output.
    `),

    /**
     * Link to documentation
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
            assertsError(error);

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
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: ExpectCommand, $taskJson: $TaskJson): $side_effect {
        // eslint-disable-next-line no-case-declarations
        const unit = command.unit.toLowerCase() as Lowercase<ExpectationUnit>;

        $taskJson.expectations = $taskJson.expectations || {};
        $taskJson.expectations[unit] = $taskJson.expectations[unit] || {};

        if (command.sign === 'MINIMUM' || command.sign === 'EXACTLY') {
            if ($taskJson.expectations[unit]!.min !== undefined) {
                throw new ParseError(
                    `Already defined minimum ${
                        $taskJson.expectations![unit]!.min
                    } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                );
            }
            $taskJson.expectations[unit]!.min = command.amount;
        } /* not else */
        if (command.sign === 'MAXIMUM' || command.sign === 'EXACTLY') {
            if ($taskJson.expectations[unit]!.max !== undefined) {
                throw new ParseError(
                    `Already defined maximum ${
                        $taskJson.expectations![unit]!.max
                    } ${command.unit.toLowerCase()}, now trying to redefine it to ${command.amount}`,
                );
            }
            $taskJson.expectations[unit]!.max = command.amount;
        }
    },

    /**
     * Converts the FORMAT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ExpectCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the FORMAT command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<ExpectCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
