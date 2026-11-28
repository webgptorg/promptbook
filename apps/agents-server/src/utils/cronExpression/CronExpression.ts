/**
 * Number of fields in a standard minute-based cron expression.
 *
 * @private constant of `cronExpression`
 */
export const CRON_EXPRESSION_FIELD_COUNT = 5;

/**
 * Parsed values of one cron field.
 *
 * @private type of `cronExpression`
 */
export type CronExpressionField = {
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
 * @private type of `cronExpression`
 */
export type ParsedCronExpression = {
    readonly minute: CronExpressionField;
    readonly hour: CronExpressionField;
    readonly dayOfMonth: CronExpressionField;
    readonly month: CronExpressionField;
    readonly dayOfWeek: CronExpressionField;
};

/**
 * Parser configuration of one cron field.
 *
 * @private type of `cronExpression`
 */
export type CronExpressionFieldOptions = {
    /**
     * Field name used in validation errors.
     */
    readonly name: string;

    /**
     * Lowest accepted value.
     */
    readonly minimum: number;

    /**
     * Highest accepted value.
     */
    readonly maximum: number;

    /**
     * Whether `7` is an alias of Sunday, which is only true for the day-of-week field.
     */
    readonly isSevenAllowedForSunday?: boolean;
};
