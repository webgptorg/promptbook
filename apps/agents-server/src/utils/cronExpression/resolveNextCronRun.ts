import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import type { ParsedCronExpression } from './CronExpression';
import { parseCronExpression } from './parseCronExpression';

/**
 * Maximum number of minutes scanned while finding the next cron run.
 *
 * Five years keeps leap-day schedules valid while still rejecting impossible expressions.
 *
 * @private constant of `cronExpression`
 */
const CRON_EXPRESSION_LOOKAHEAD_MINUTES = 366 * 24 * 60 * 5;

/**
 * Finds the next local server time matching one cron expression.
 *
 * @param cronExpression - Cron expression, validated on the fly.
 * @param afterDate - Date after which the next run must happen.
 * @returns Next matching local server time.
 *
 * @private function of `cronExpression`
 */
export function resolveNextCronRun(cronExpression: string, afterDate = new Date()): Date {
    return resolveNextCronRunFromParsedExpression(parseCronExpression(cronExpression), afterDate);
}

/**
 * Finds the next local server time matching one already parsed cron expression.
 *
 * @param parsedCronExpression - Parsed cron expression.
 * @param afterDate - Date after which the next run must happen.
 * @returns Next matching local server time.
 *
 * @private function of `cronExpression`
 */
export function resolveNextCronRunFromParsedExpression(
    parsedCronExpression: ParsedCronExpression,
    afterDate: Date,
): Date {
    const cursor = new Date(afterDate.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    for (let index = 0; index < CRON_EXPRESSION_LOOKAHEAD_MINUTES; index++) {
        if (isCronExpressionDateMatched(parsedCronExpression, cursor)) {
            return new Date(cursor.getTime());
        }

        cursor.setMinutes(cursor.getMinutes() + 1);
    }

    throw new ParseError(
        spaceTrim(`
            Cron expression cannot be scheduled.

            **Use a cron expression that matches at least one valid date.**
        `),
    );
}

/**
 * Tests whether one date matches a parsed cron expression.
 *
 * @param parsedCronExpression - Parsed cron expression.
 * @param date - Candidate local server date.
 * @returns `true` when the date matches.
 *
 * @private function of `resolveNextCronRun`
 */
function isCronExpressionDateMatched(parsedCronExpression: ParsedCronExpression, date: Date): boolean {
    if (!parsedCronExpression.minute.values.has(date.getMinutes())) {
        return false;
    }

    if (!parsedCronExpression.hour.values.has(date.getHours())) {
        return false;
    }

    if (!parsedCronExpression.month.values.has(date.getMonth() + 1)) {
        return false;
    }

    const isDayOfMonthMatched = parsedCronExpression.dayOfMonth.values.has(date.getDate());
    const isDayOfWeekMatched = parsedCronExpression.dayOfWeek.values.has(date.getDay());

    if (parsedCronExpression.dayOfMonth.isWildcard && parsedCronExpression.dayOfWeek.isWildcard) {
        return true;
    }

    if (parsedCronExpression.dayOfMonth.isWildcard) {
        return isDayOfWeekMatched;
    }

    if (parsedCronExpression.dayOfWeek.isWildcard) {
        return isDayOfMonthMatched;
    }

    return isDayOfMonthMatched || isDayOfWeekMatched;
}
