import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import { normalizeCronExpressionWhitespace } from './normalizeCronExpressionWhitespace';
import { parseCronExpression } from './parseCronExpression';
import { resolveNextCronRunFromParsedExpression } from './resolveNextCronRun';

/**
 * Normalizes and validates one cron expression.
 *
 * An expression which parses but never matches a real date, such as `0 0 30 2 *`, is rejected here
 * instead of silently becoming a schedule that never runs.
 *
 * @param expression - Raw cron expression.
 * @returns Whitespace-normalized expression.
 *
 * @private function of `cronExpression`
 */
export function normalizeCronExpression(expression: string): string {
    const normalizedExpression = normalizeCronExpressionWhitespace(expression);

    if (normalizedExpression === '') {
        throw new ParseError(
            spaceTrim(`
                Cron expression is empty.

                **Use exactly five fields:** minute hour day-of-month month day-of-week.
            `),
        );
    }

    resolveNextCronRunFromParsedExpression(parseCronExpression(normalizedExpression), new Date());

    return normalizedExpression;
}
