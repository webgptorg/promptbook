import type { CronExpressionField, CronExpressionFieldOptions } from './CronExpression';
import { throwInvalidCronExpressionField } from './throwInvalidCronExpressionField';

/**
 * Parses one cron field with comma lists, ranges, and step values.
 *
 * @param field - Raw field value.
 * @param options - Numeric bounds and label of the field.
 * @returns Parsed field values.
 *
 * @private function of `cronExpression`
 */
export function parseCronExpressionField(field: string, options: CronExpressionFieldOptions): CronExpressionField {
    const values = new Set<number>();
    const isWildcard = field === '*';

    for (const part of field.split(',')) {
        if (!part) {
            throwInvalidCronExpressionField(field, options.name);
        }

        addCronExpressionFieldPart(values, part, options);
    }

    if (values.size === 0) {
        throwInvalidCronExpressionField(field, options.name);
    }

    return { values, isWildcard };
}

/**
 * Adds the values represented by one comma-separated cron field part.
 *
 * @param values - Mutable field value set.
 * @param part - Field part, for example a wildcard, `1-5`, or a stepped wildcard.
 * @param options - Numeric bounds and label of the field.
 *
 * @private function of `parseCronExpressionField`
 */
function addCronExpressionFieldPart(values: Set<number>, part: string, options: CronExpressionFieldOptions): void {
    const stepSplit = part.split('/');
    if (stepSplit.length > 2) {
        throwInvalidCronExpressionField(part, options.name);
    }

    const rangePart = stepSplit[0]!;
    const step = stepSplit[1] === undefined ? 1 : parseCronExpressionNumber(stepSplit[1], options.name);
    if (step <= 0) {
        throwInvalidCronExpressionField(part, options.name);
    }

    const { start, end } = parseCronExpressionRange(rangePart, options);
    for (let value = start; value <= end; value += step) {
        values.add(normalizeCronExpressionFieldValue(value, options));
    }
}

/**
 * Parses the range portion of one cron field part.
 *
 * @param rangePart - Range part before the optional `/step`.
 * @param options - Numeric bounds and label of the field.
 * @returns Start and end range values.
 *
 * @private function of `parseCronExpressionField`
 */
function parseCronExpressionRange(
    rangePart: string,
    options: CronExpressionFieldOptions,
): { readonly start: number; readonly end: number } {
    if (rangePart === '*') {
        return { start: options.minimum, end: options.maximum };
    }

    const rangeSplit = rangePart.split('-');
    if (rangeSplit.length > 2 || rangeSplit.some((value) => value === '')) {
        throwInvalidCronExpressionField(rangePart, options.name);
    }

    const start = parseCronExpressionNumber(rangeSplit[0]!, options.name);
    const end = rangeSplit[1] === undefined ? start : parseCronExpressionNumber(rangeSplit[1], options.name);

    if (start > end) {
        throwInvalidCronExpressionField(rangePart, options.name);
    }

    assertCronExpressionFieldValueInRange(start, options);
    assertCronExpressionFieldValueInRange(end, options);

    return { start, end };
}

/**
 * Parses one positive cron integer token.
 *
 * @param value - Raw token.
 * @param fieldName - Field name used in validation errors.
 * @returns Parsed integer.
 *
 * @private function of `parseCronExpressionField`
 */
function parseCronExpressionNumber(value: string, fieldName: string): number {
    if (!/^\d+$/u.test(value)) {
        throwInvalidCronExpressionField(value, fieldName);
    }

    return Number.parseInt(value, 10);
}

/**
 * Asserts that one parsed cron value is inside the field bounds.
 *
 * @param value - Parsed value.
 * @param options - Numeric bounds and label of the field.
 *
 * @private function of `parseCronExpressionField`
 */
function assertCronExpressionFieldValueInRange(value: number, options: CronExpressionFieldOptions): void {
    if (value < options.minimum || value > options.maximum) {
        throwInvalidCronExpressionField(String(value), options.name);
    }
}

/**
 * Normalizes Sunday from `7` to `0` in the day-of-week field.
 *
 * @param value - Parsed field value.
 * @param options - Numeric bounds and label of the field.
 * @returns Normalized value.
 *
 * @private function of `parseCronExpressionField`
 */
function normalizeCronExpressionFieldValue(value: number, options: CronExpressionFieldOptions): number {
    if (options.isSevenAllowedForSunday && value === 7) {
        return 0;
    }

    return value;
}
