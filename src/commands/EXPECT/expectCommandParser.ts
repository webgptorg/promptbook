import spaceTrim from 'spacetrim';
import { EXPECTATION_UNITS } from '../../_packages/types.index';
import { parseNumber } from '../_common/parseNumber';
import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { ExpectAmountCommand } from './ExpectAmountCommand';
import { ExpectCommand } from './ExpectCommand';
import { ExpectFormatCommand } from './ExpectFormatCommand';

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
     * Aliases for the EXPECT command
     */
    aliases: ['BP'],

    /**
     * Description of the EXPECT command
     */
    description: spaceTrim(`
        Expect command describes the desired output of the prompt template (after post-processing)
        It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs or some other shape of the output.
    `),

    /**
     * Example usages of the EXPECT command
     */
    examples: ['EXPECT foo', 'EXPECT bar', 'BP foo', 'BP bar'],

    /**
     * Parses the EXPECT command
     */
    parse(input: CommandParserInput): ExpectCommand {
        const { args ,normalized} = input;

        if(normalized.startsWith('EXPECT_JSON')){
          return {
            type: 'EXPECT_FORMAT',
            format: 'JSON',
        } satisfies ExpectFormatCommand;

        // [🥤]
        }else if (normalized.startsWith('EXPECT')) {
          try {
            args.shift();

              let sign: ExpectAmountCommand['sign'];
              const signRaw = items.shift()!;
              if (/^exact/i.test(signRaw)) {
                  sign = 'EXACTLY';
              } else if (/^min/i.test(signRaw)) {
                  sign = 'MINIMUM';
              } else if (/^max/i.test(signRaw)) {
                  sign = 'MAXIMUM';
              } else {
                  throw new SyntaxError(`Invalid sign "${signRaw}", expected EXACTLY, MIN or MAX`);
              }

              const amountRaw = args.shift()!;
              const amount = parseNumber(amountRaw);
              if (amount < 0) {
                  throw new SyntaxError('Amount must be positive number or zero');
              }
              if (amount !== Math.floor(amount)) {
                  throw new SyntaxError('Amount must be whole number');
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
                          throw new SyntaxError(`Ambiguous unit "${unitRaw}"`);
                      }
                      unit = existingUnit;
                  }
              }
              if (unit === undefined) {
                  throw new SyntaxError(`Invalid unit "${unitRaw}"`);
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

              throw new SyntaxError(
                  spaceTrim(block=>
                      `
                          Invalid EXPECT command
                          ${block(error.message)}:
                      `,
                  ),
              );
          }
    },
};
