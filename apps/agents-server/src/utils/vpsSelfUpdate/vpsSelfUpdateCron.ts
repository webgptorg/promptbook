import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';

/**
 * Default automatic self-update cron expression: every day at midnight.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION = '0 0 * * *';

/**
 * Number of fields in a standard minute-based cron expression.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_CRON_FIELD_COUNT = 5;

/**
 * Maximum number of minutes scanned while finding the next cron run.
 *
 * Five years keeps leap-day schedules valid while still rejecting impossible expressions.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_CRON_LOOKAHEAD_MINUTES = 366 * 24 * 60 * 5;

/**
 * Parsed cron field values.
 *
 * @private type of `vpsSelfUpdateCron`
 */
type VpsSelfUpdateCronField = {
    /**
     * Accepted numeric values for this field.
     */
    readonly values: ReadonlySet<number>;
    /**
     * Whether the field is the unrestricted `*` wildcard.
     */
    readonly isWildcard: boolean;
};

/**
 * Parsed five-field cron expression.
 *
 * @private type of `vpsSelfUpdateCron`
 */
type VpsSelfUpdateCronExpression = {
    readonly minute: VpsSelfUpdateCronField;
    readonly hour: VpsSelfUpdateCronField;
    readonly dayOfMonth: VpsSelfUpdateCronField;
    readonly month: VpsSelfUpdateCronField;
    readonly dayOfWeek: VpsSelfUpdateCronField;
};

/**
 * One cron field parser configuration.
 *
 * @private type of `vpsSelfUpdateCron`
 */
type VpsSelfUpdateCronFieldOptions = {
    readonly name: string;
    readonly minimum: number;
    readonly maximum: number;
    readonly isSevenAllowedForSunday?: boolean;
};

/**
 * Normalizes and validates a cron expression accepted by the automatic self-update scheduler.
 *
 * @param value - Raw `.env` cron expression.
 * @returns Normalized cron expression.
 *
 * @private function of `vpsSelfUpdate`
 */
export function normalizeVpsSelfUpdateCronExpression(value: string | null | undefined): string {
    const normalizedExpression = normalizeVpsSelfUpdateCronWhitespace(value || DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION);
    const cronExpression = parseVpsSelfUpdateCronExpression(normalizedExpression);

    resolveNextVpsSelfUpdateCronRunFromParsedExpression(cronExpression, new Date());

    return normalizedExpression;
}

/**
 * Resolves the next run time for one automatic self-update cron expression.
 *
 * @param cronExpression - Valid five-field cron expression.
 * @param afterDate - Date after which the next run must happen.
 * @returns Next matching local server time.
 *
 * @private function of `vpsSelfUpdate`
 */
export function resolveNextVpsSelfUpdateCronRun(cronExpression: string, afterDate = new Date()): Date {
    return resolveNextVpsSelfUpdateCronRunFromParsedExpression(
        parseVpsSelfUpdateCronExpression(normalizeVpsSelfUpdateCronWhitespace(cronExpression)),
        afterDate,
    );
}

/**
 * Collapses cron whitespace without changing field values.
 *
 * @param value - Raw cron expression.
 * @returns Whitespace-normalized expression.
 */
function normalizeVpsSelfUpdateCronWhitespace(value: string): string {
    return value.trim().replace(/\s+/gu, ' ') || DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION;
}

/**
 * Parses a five-field cron expression into numeric field sets.
 *
 * @param expression - Normalized cron expression.
 * @returns Parsed cron expression.
 */
function parseVpsSelfUpdateCronExpression(expression: string): VpsSelfUpdateCronExpression {
    const fields = expression.split(' ');
    if (fields.length !== VPS_SELF_UPDATE_CRON_FIELD_COUNT) {
        throw new NotAllowed(
            spaceTrim(`
                Automatic self-update cron expression \`${expression}\` is invalid.

                **Use exactly five fields:** minute hour day-of-month month day-of-week.
            `),
        );
    }

    return {
        minute: parseVpsSelfUpdateCronField(fields[0]!, { name: 'minute', minimum: 0, maximum: 59 }),
        hour: parseVpsSelfUpdateCronField(fields[1]!, { name: 'hour', minimum: 0, maximum: 23 }),
        dayOfMonth: parseVpsSelfUpdateCronField(fields[2]!, { name: 'day-of-month', minimum: 1, maximum: 31 }),
        month: parseVpsSelfUpdateCronField(fields[3]!, { name: 'month', minimum: 1, maximum: 12 }),
        dayOfWeek: parseVpsSelfUpdateCronField(fields[4]!, {
            name: 'day-of-week',
            minimum: 0,
            maximum: 7,
            isSevenAllowedForSunday: true,
        }),
    };
}

/**
 * Parses one cron field with comma lists, ranges, and step values.
 *
 * @param field - Raw field value.
 * @param options - Numeric bounds and label.
 * @returns Parsed field values.
 */
function parseVpsSelfUpdateCronField(field: string, options: VpsSelfUpdateCronFieldOptions): VpsSelfUpdateCronField {
    const values = new Set<number>();
    const isWildcard = field === '*';

    for (const part of field.split(',')) {
        if (!part) {
            throwInvalidVpsSelfUpdateCronField(field, options.name);
        }

        addVpsSelfUpdateCronFieldPart(values, part, options);
    }

    if (values.size === 0) {
        throwInvalidVpsSelfUpdateCronField(field, options.name);
    }

    return { values, isWildcard };
}

/**
 * Adds values represented by one comma-separated cron field part.
 *
 * @param values - Mutable field value set.
 * @param part - Field part, for example a wildcard, `1-5`, or a stepped wildcard.
 * @param options - Numeric bounds and label.
 */
function addVpsSelfUpdateCronFieldPart(
    values: Set<number>,
    part: string,
    options: VpsSelfUpdateCronFieldOptions,
): void {
    const stepSplit = part.split('/');
    if (stepSplit.length > 2) {
        throwInvalidVpsSelfUpdateCronField(part, options.name);
    }

    const rangePart = stepSplit[0]!;
    const step = stepSplit[1] === undefined ? 1 : parseVpsSelfUpdateCronNumber(stepSplit[1], options.name);
    if (step <= 0) {
        throwInvalidVpsSelfUpdateCronField(part, options.name);
    }

    const { start, end } = parseVpsSelfUpdateCronRange(rangePart, options);
    for (let value = start; value <= end; value += step) {
        values.add(normalizeVpsSelfUpdateCronFieldValue(value, options));
    }
}

/**
 * Parses the range portion of one cron field part.
 *
 * @param rangePart - Range part before optional `/step`.
 * @param options - Numeric bounds and label.
 * @returns Start and end range values.
 */
function parseVpsSelfUpdateCronRange(
    rangePart: string,
    options: VpsSelfUpdateCronFieldOptions,
): { readonly start: number; readonly end: number } {
    if (rangePart === '*') {
        return { start: options.minimum, end: options.maximum };
    }

    const rangeSplit = rangePart.split('-');
    if (rangeSplit.length > 2 || rangeSplit.some((value) => value === '')) {
        throwInvalidVpsSelfUpdateCronField(rangePart, options.name);
    }

    const start = parseVpsSelfUpdateCronNumber(rangeSplit[0]!, options.name);
    const end = rangeSplit[1] === undefined ? start : parseVpsSelfUpdateCronNumber(rangeSplit[1], options.name);

    if (start > end) {
        throwInvalidVpsSelfUpdateCronField(rangePart, options.name);
    }

    assertVpsSelfUpdateCronFieldValueInRange(start, options);
    assertVpsSelfUpdateCronFieldValueInRange(end, options);

    return { start, end };
}

/**
 * Parses one positive cron integer token.
 *
 * @param value - Raw token.
 * @param fieldName - Field name used in validation errors.
 * @returns Parsed integer.
 */
function parseVpsSelfUpdateCronNumber(value: string, fieldName: string): number {
    if (!/^\d+$/u.test(value)) {
        throwInvalidVpsSelfUpdateCronField(value, fieldName);
    }

    return Number.parseInt(value, 10);
}

/**
 * Asserts that one parsed cron value is inside the field bounds.
 *
 * @param value - Parsed value.
 * @param options - Numeric bounds and label.
 */
function assertVpsSelfUpdateCronFieldValueInRange(value: number, options: VpsSelfUpdateCronFieldOptions): void {
    if (value < options.minimum || value > options.maximum) {
        throwInvalidVpsSelfUpdateCronField(String(value), options.name);
    }
}

/**
 * Normalizes Sunday from `7` to `0` in the day-of-week field.
 *
 * @param value - Parsed field value.
 * @param options - Numeric bounds and label.
 * @returns Normalized value.
 */
function normalizeVpsSelfUpdateCronFieldValue(value: number, options: VpsSelfUpdateCronFieldOptions): number {
    if (options.isSevenAllowedForSunday && value === 7) {
        return 0;
    }

    return value;
}

/**
 * Finds the next local server time matching a parsed cron expression.
 *
 * @param cronExpression - Parsed cron expression.
 * @param afterDate - Date after which the next run must happen.
 * @returns Next matching date.
 */
function resolveNextVpsSelfUpdateCronRunFromParsedExpression(
    cronExpression: VpsSelfUpdateCronExpression,
    afterDate: Date,
): Date {
    const cursor = new Date(afterDate.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    for (let index = 0; index < VPS_SELF_UPDATE_CRON_LOOKAHEAD_MINUTES; index++) {
        if (isVpsSelfUpdateCronDateMatched(cronExpression, cursor)) {
            return new Date(cursor.getTime());
        }

        cursor.setMinutes(cursor.getMinutes() + 1);
    }

    throw new NotAllowed(
        spaceTrim(`
            Automatic self-update cron expression cannot be scheduled.

            **Use a cron expression that matches at least one valid date.**
        `),
    );
}

/**
 * Tests whether one date matches a parsed cron expression.
 *
 * @param cronExpression - Parsed cron expression.
 * @param date - Candidate local server date.
 * @returns `true` when the date matches.
 */
function isVpsSelfUpdateCronDateMatched(cronExpression: VpsSelfUpdateCronExpression, date: Date): boolean {
    if (!cronExpression.minute.values.has(date.getMinutes())) {
        return false;
    }

    if (!cronExpression.hour.values.has(date.getHours())) {
        return false;
    }

    if (!cronExpression.month.values.has(date.getMonth() + 1)) {
        return false;
    }

    const isDayOfMonthMatched = cronExpression.dayOfMonth.values.has(date.getDate());
    const isDayOfWeekMatched = cronExpression.dayOfWeek.values.has(date.getDay());

    if (cronExpression.dayOfMonth.isWildcard && cronExpression.dayOfWeek.isWildcard) {
        return true;
    }

    if (cronExpression.dayOfMonth.isWildcard) {
        return isDayOfWeekMatched;
    }

    if (cronExpression.dayOfWeek.isWildcard) {
        return isDayOfMonthMatched;
    }

    return isDayOfMonthMatched || isDayOfWeekMatched;
}

/**
 * Throws a branded cron validation error for one field.
 *
 * @param value - Invalid field value.
 * @param fieldName - Field name used in the error message.
 */
function throwInvalidVpsSelfUpdateCronField(value: string, fieldName: string): never {
    throw new NotAllowed(
        spaceTrim(`
            Automatic self-update cron field \`${fieldName}\` contains invalid value \`${value}\`.

            **Use numbers, \`*\`, comma lists, ranges, and step values only.**
        `),
    );
}
