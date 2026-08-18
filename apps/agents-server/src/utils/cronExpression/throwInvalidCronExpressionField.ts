import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';

/**
 * Throws a branded validation error for one invalid cron field value.
 *
 * @param value - Invalid field value.
 * @param fieldName - Field name shown in the error message.
 *
 * @private function of `cronExpression`
 */
export function throwInvalidCronExpressionField(value: string, fieldName: string): never {
    throw new ParseError(
        spaceTrim(`
            Cron field \`${fieldName}\` contains invalid value \`${value}\`.

            **Use numbers, \`*\`, comma lists, ranges, and step values only.**
        `),
    );
}
