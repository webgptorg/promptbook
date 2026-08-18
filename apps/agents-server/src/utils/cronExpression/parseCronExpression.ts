import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import { CRON_EXPRESSION_FIELD_COUNT, type ParsedCronExpression } from './CronExpression';
import { normalizeCronExpressionWhitespace } from './normalizeCronExpressionWhitespace';
import { parseCronExpressionField } from './parseCronExpressionField';

/**
 * Parses one five-field cron expression into numeric field sets.
 *
 * @param expression - Raw cron expression, for example `15 9-17 * * 1-5`.
 * @returns Parsed cron expression.
 *
 * @private function of `cronExpression`
 */
export function parseCronExpression(expression: string): ParsedCronExpression {
    const normalizedExpression = normalizeCronExpressionWhitespace(expression);
    const fields = normalizedExpression.split(' ');

    if (fields.length !== CRON_EXPRESSION_FIELD_COUNT) {
        throw new ParseError(
            spaceTrim(`
                Cron expression \`${normalizedExpression}\` is invalid.

                **Use exactly five fields:** minute hour day-of-month month day-of-week.
            `),
        );
    }

    return {
        minute: parseCronExpressionField(fields[0]!, { name: 'minute', minimum: 0, maximum: 59 }),
        hour: parseCronExpressionField(fields[1]!, { name: 'hour', minimum: 0, maximum: 23 }),
        dayOfMonth: parseCronExpressionField(fields[2]!, { name: 'day-of-month', minimum: 1, maximum: 31 }),
        month: parseCronExpressionField(fields[3]!, { name: 'month', minimum: 1, maximum: 12 }),
        dayOfWeek: parseCronExpressionField(fields[4]!, {
            name: 'day-of-week',
            minimum: 0,
            maximum: 7,
            isSevenAllowedForSunday: true,
        }),
    };
}
