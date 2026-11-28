'use client';

import { useId, useMemo } from 'react';

/**
 * Cron schedule kinds supported by the friendly configuration controls.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobScheduleKind = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Props for the shared cron job configuration component.
 *
 * @private shared Agents Server UI props
 */
export type CronJobConfigurationProps = {
    /**
     * Current cron expression.
     */
    readonly value: string;
    /**
     * Called whenever the wizard or direct cron field changes the expression.
     */
    readonly onChange: (value: string) => void;
    /**
     * Whether all controls should be disabled.
     */
    readonly isDisabled?: boolean;
    /**
     * Optional label rendered above the cron controls.
     */
    readonly label?: string;
    /**
     * Optional helper text rendered below the direct cron field.
     */
    readonly helperText?: string;
    /**
     * Additional wrapper classes.
     */
    readonly className?: string;
};

/**
 * Parsed schedule draft used to keep the friendly controls stateless.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobScheduleDraft = {
    readonly kind: CronJobScheduleKind;
    readonly minute: number;
    readonly hour: number;
    readonly dayOfWeek: number;
    readonly dayOfMonth: number;
};

/**
 * Props for the friendly cron wizard fields.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobWizardFieldsProps = {
    readonly idPrefix: string;
    readonly scheduleDraft: CronJobScheduleDraft;
    readonly isDisabled: boolean;
    readonly onChange: (value: string) => void;
};

/**
 * Props for a numeric cron select field.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobNumberSelectFieldProps = {
    readonly id: string;
    readonly label: string;
    readonly value: number;
    readonly options: ReadonlyArray<number>;
    readonly isDisabled: boolean;
    readonly onChange: (value: number) => void;
    readonly formatOptionLabel?: (value: number) => string;
};

/**
 * Props for the schedule kind select field.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobScheduleKindSelectProps = {
    readonly id: string;
    readonly value: CronJobScheduleKind;
    readonly isDisabled: boolean;
    readonly onChange: (value: CronJobScheduleKind) => void;
};

/**
 * Props for the weekly day selector.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobDayOfWeekSelectProps = {
    readonly id: string;
    readonly value: number;
    readonly isDisabled: boolean;
    readonly onChange: (value: number) => void;
};

/**
 * Props for the daily/weekly/monthly time field.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobTimeFieldProps = {
    readonly id: string;
    readonly hour: number;
    readonly minute: number;
    readonly isDisabled: boolean;
    readonly onChange: (hour: number, minute: number) => void;
};

/**
 * Option shown in the schedule kind select.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobScheduleKindOption = {
    readonly value: CronJobScheduleKind;
    readonly label: string;
};

/**
 * Weekday option shown in the weekly schedule selector.
 *
 * @private type of `<CronJobConfiguration/>`
 */
type CronJobDayOfWeekOption = {
    readonly value: number;
    readonly label: string;
};

/**
 * Default hour used when switching from a custom cron expression to a common schedule.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const DEFAULT_CRON_JOB_HOUR = 0;

/**
 * Default minute used when switching from a custom cron expression to a common schedule.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const DEFAULT_CRON_JOB_MINUTE = 0;

/**
 * Default weekday used for newly selected weekly schedules.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const DEFAULT_CRON_JOB_DAY_OF_WEEK = 1;

/**
 * Default month day used for newly selected monthly schedules.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const DEFAULT_CRON_JOB_DAY_OF_MONTH = 1;

/**
 * Hourly cron expression matcher.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const HOURLY_CRON_EXPRESSION_PATTERN = /^(\d{1,2}) \* \* \* \*$/u;

/**
 * Daily cron expression matcher.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const DAILY_CRON_EXPRESSION_PATTERN = /^(\d{1,2}) (\d{1,2}) \* \* \*$/u;

/**
 * Weekly cron expression matcher.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const WEEKLY_CRON_EXPRESSION_PATTERN = /^(\d{1,2}) (\d{1,2}) \* \* ([0-7])$/u;

/**
 * Monthly cron expression matcher.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const MONTHLY_CRON_EXPRESSION_PATTERN = /^(\d{1,2}) (\d{1,2}) ([1-9]|[12]\d|3[01]) \* \*$/u;

/**
 * Browser time input value matcher.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/u;

/**
 * Schedule kinds offered by the friendly wizard.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_SCHEDULE_KIND_OPTIONS: ReadonlyArray<CronJobScheduleKindOption> = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom cron expression' },
];

/**
 * Weekday values accepted by standard five-field cron notation.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_DAY_OF_WEEK_OPTIONS: ReadonlyArray<CronJobDayOfWeekOption> = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

/**
 * Minute options used by hourly schedules.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_MINUTE_OPTIONS = createCronJobNumberOptions(0, 59);

/**
 * Day-of-month options used by monthly schedules.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_DAY_OF_MONTH_OPTIONS = createCronJobNumberOptions(1, 31);

/**
 * Shared Tailwind classes for labels inside the cron component.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_LABEL_CLASS_NAME = 'block min-w-0 text-sm font-medium text-slate-700';

/**
 * Shared Tailwind classes for inputs and selects inside the cron component.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_CONTROL_CLASS_NAME =
    'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

/**
 * Shared Tailwind classes for the monospace cron expression input.
 *
 * @private constant of `<CronJobConfiguration/>`
 */
const CRON_JOB_EXPRESSION_CONTROL_CLASS_NAME = `${CRON_JOB_CONTROL_CLASS_NAME} font-mono`;

/**
 * Renders a shared cron job configuration input with friendly schedule controls and direct cron editing.
 *
 * @param props - Component props.
 * @returns Cron job configuration controls.
 *
 * @private shared Agents Server component
 */
export function CronJobConfiguration(props: CronJobConfigurationProps) {
    const { value, onChange, isDisabled = false, label, helperText, className } = props;
    const generatedId = useId();
    const scheduleDraft = useMemo(() => createCronJobScheduleDraft(value), [value]);
    const helperTextId = helperText ? `${generatedId}-helper` : undefined;
    const expressionInputId = `${generatedId}-expression`;

    return (
        <div className={['min-w-0 space-y-3', className].filter(Boolean).join(' ')}>
            {label && <div className="text-sm font-medium text-slate-700">{label}</div>}

            <CronJobWizardFields
                idPrefix={generatedId}
                scheduleDraft={scheduleDraft}
                isDisabled={isDisabled}
                onChange={onChange}
            />

            <label className={CRON_JOB_LABEL_CLASS_NAME} htmlFor={expressionInputId}>
                Cron expression
                <input
                    id={expressionInputId}
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={isDisabled}
                    placeholder="0 0 * * *"
                    aria-describedby={helperTextId}
                    className={CRON_JOB_EXPRESSION_CONTROL_CLASS_NAME}
                />
            </label>

            {helperText && (
                <p id={helperTextId} className="text-xs leading-5 text-slate-500">
                    {helperText}
                </p>
            )}
        </div>
    );
}

/**
 * Renders the common-schedule wizard controls.
 *
 * @param props - Component props.
 * @returns Friendly cron controls.
 */
function CronJobWizardFields(props: CronJobWizardFieldsProps) {
    const { idPrefix, scheduleDraft, isDisabled, onChange } = props;
    const scheduleKindInputId = `${idPrefix}-schedule-kind`;

    return (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <CronJobScheduleKindSelect
                id={scheduleKindInputId}
                value={scheduleDraft.kind}
                isDisabled={isDisabled}
                onChange={(kind) => {
                    if (kind === 'custom') {
                        return;
                    }

                    onChange(createCronJobExpression({ ...scheduleDraft, kind }));
                }}
            />

            <CronJobScheduleDetails
                idPrefix={idPrefix}
                scheduleDraft={scheduleDraft}
                isDisabled={isDisabled || scheduleDraft.kind === 'custom'}
                onChange={onChange}
            />
        </div>
    );
}

/**
 * Renders details for the selected common schedule kind.
 *
 * @param props - Component props.
 * @returns Schedule detail controls or a custom-mode placeholder.
 */
function CronJobScheduleDetails(props: CronJobWizardFieldsProps) {
    const { idPrefix, scheduleDraft, isDisabled, onChange } = props;

    if (scheduleDraft.kind === 'hourly') {
        return (
            <CronJobNumberSelectField
                id={`${idPrefix}-minute`}
                label="Minute"
                value={scheduleDraft.minute}
                options={CRON_JOB_MINUTE_OPTIONS}
                isDisabled={isDisabled}
                onChange={(minute) => onChange(createCronJobExpression({ ...scheduleDraft, minute }))}
                formatOptionLabel={formatCronJobMinuteOption}
            />
        );
    }

    if (scheduleDraft.kind === 'weekly') {
        return (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <CronJobDayOfWeekSelect
                    id={`${idPrefix}-day-of-week`}
                    value={scheduleDraft.dayOfWeek}
                    isDisabled={isDisabled}
                    onChange={(dayOfWeek) => onChange(createCronJobExpression({ ...scheduleDraft, dayOfWeek }))}
                />
                <CronJobTimeField
                    id={`${idPrefix}-time`}
                    hour={scheduleDraft.hour}
                    minute={scheduleDraft.minute}
                    isDisabled={isDisabled}
                    onChange={(hour, minute) => onChange(createCronJobExpression({ ...scheduleDraft, hour, minute }))}
                />
            </div>
        );
    }

    if (scheduleDraft.kind === 'monthly') {
        return (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <CronJobNumberSelectField
                    id={`${idPrefix}-day-of-month`}
                    label="Day"
                    value={scheduleDraft.dayOfMonth}
                    options={CRON_JOB_DAY_OF_MONTH_OPTIONS}
                    isDisabled={isDisabled}
                    onChange={(dayOfMonth) => onChange(createCronJobExpression({ ...scheduleDraft, dayOfMonth }))}
                    formatOptionLabel={formatCronJobDayOfMonthOption}
                />
                <CronJobTimeField
                    id={`${idPrefix}-time`}
                    hour={scheduleDraft.hour}
                    minute={scheduleDraft.minute}
                    isDisabled={isDisabled}
                    onChange={(hour, minute) => onChange(createCronJobExpression({ ...scheduleDraft, hour, minute }))}
                />
            </div>
        );
    }

    if (scheduleDraft.kind === 'daily') {
        return (
            <CronJobTimeField
                id={`${idPrefix}-time`}
                hour={scheduleDraft.hour}
                minute={scheduleDraft.minute}
                isDisabled={isDisabled}
                onChange={(hour, minute) => onChange(createCronJobExpression({ ...scheduleDraft, hour, minute }))}
            />
        );
    }

    return (
        <div className="flex min-h-[4.25rem] items-end text-xs leading-5 text-slate-500">
            Edit the cron expression directly.
        </div>
    );
}

/**
 * Renders the schedule kind selector.
 *
 * @param props - Component props.
 * @returns Schedule kind select.
 */
function CronJobScheduleKindSelect(props: CronJobScheduleKindSelectProps) {
    const { id, value, isDisabled, onChange } = props;

    return (
        <label className={CRON_JOB_LABEL_CLASS_NAME} htmlFor={id}>
            Repeat
            <select
                id={id}
                value={value}
                disabled={isDisabled}
                onChange={(event) => onChange(event.target.value as CronJobScheduleKind)}
                className={CRON_JOB_CONTROL_CLASS_NAME}
            >
                {CRON_JOB_SCHEDULE_KIND_OPTIONS.map((option) => {
                    const isOptionDisabled = option.value === 'custom' && value !== 'custom';

                    return (
                        <option key={option.value} value={option.value} disabled={isOptionDisabled}>
                            {option.label}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}

/**
 * Renders a numeric cron value selector.
 *
 * @param props - Component props.
 * @returns Numeric select field.
 */
function CronJobNumberSelectField(props: CronJobNumberSelectFieldProps) {
    const { id, label, value, options, isDisabled, onChange, formatOptionLabel = String } = props;

    return (
        <label className={CRON_JOB_LABEL_CLASS_NAME} htmlFor={id}>
            {label}
            <select
                id={id}
                value={value}
                disabled={isDisabled}
                onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
                className={CRON_JOB_CONTROL_CLASS_NAME}
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {formatOptionLabel(option)}
                    </option>
                ))}
            </select>
        </label>
    );
}

/**
 * Renders the day-of-week selector.
 *
 * @param props - Component props.
 * @returns Day-of-week select field.
 */
function CronJobDayOfWeekSelect(props: CronJobDayOfWeekSelectProps) {
    const { id, value, isDisabled, onChange } = props;

    return (
        <label className={CRON_JOB_LABEL_CLASS_NAME} htmlFor={id}>
            Day
            <select
                id={id}
                value={value}
                disabled={isDisabled}
                onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
                className={CRON_JOB_CONTROL_CLASS_NAME}
            >
                {CRON_JOB_DAY_OF_WEEK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/**
 * Renders a browser-native time field and converts it to cron hour/minute values.
 *
 * @param props - Component props.
 * @returns Time input field.
 */
function CronJobTimeField(props: CronJobTimeFieldProps) {
    const { id, hour, minute, isDisabled, onChange } = props;

    return (
        <label className={CRON_JOB_LABEL_CLASS_NAME} htmlFor={id}>
            Time
            <input
                id={id}
                type="time"
                value={formatCronJobTimeInputValue(hour, minute)}
                disabled={isDisabled}
                onChange={(event) => {
                    const parsedTime = parseCronJobTimeInputValue(event.target.value);

                    if (!parsedTime) {
                        return;
                    }

                    onChange(parsedTime.hour, parsedTime.minute);
                }}
                className={CRON_JOB_CONTROL_CLASS_NAME}
            />
        </label>
    );
}

/**
 * Creates an inclusive number option range.
 *
 * @param firstValue - First value in the range.
 * @param lastValue - Last value in the range.
 * @returns Numeric option values.
 */
function createCronJobNumberOptions(firstValue: number, lastValue: number): ReadonlyArray<number> {
    return Array.from({ length: lastValue - firstValue + 1 }, (_, index) => firstValue + index);
}

/**
 * Creates a schedule draft from the current cron expression.
 *
 * @param value - Current cron expression.
 * @returns Friendly schedule draft.
 */
function createCronJobScheduleDraft(value: string): CronJobScheduleDraft {
    const expression = normalizeCronJobExpressionWhitespace(value);
    const cronParts = parseCronJobExpressionParts(expression);

    const hourlyMatch = expression.match(HOURLY_CRON_EXPRESSION_PATTERN);
    if (hourlyMatch && isCronJobMinute(hourlyMatch[1]!)) {
        return { ...cronParts, kind: 'hourly', minute: Number.parseInt(hourlyMatch[1]!, 10) };
    }

    const dailyMatch = expression.match(DAILY_CRON_EXPRESSION_PATTERN);
    if (dailyMatch && isCronJobMinute(dailyMatch[1]!) && isCronJobHour(dailyMatch[2]!)) {
        return {
            ...cronParts,
            kind: 'daily',
            minute: Number.parseInt(dailyMatch[1]!, 10),
            hour: Number.parseInt(dailyMatch[2]!, 10),
        };
    }

    const weeklyMatch = expression.match(WEEKLY_CRON_EXPRESSION_PATTERN);
    if (
        weeklyMatch &&
        isCronJobMinute(weeklyMatch[1]!) &&
        isCronJobHour(weeklyMatch[2]!) &&
        isCronJobDayOfWeek(weeklyMatch[3]!)
    ) {
        return {
            ...cronParts,
            kind: 'weekly',
            minute: Number.parseInt(weeklyMatch[1]!, 10),
            hour: Number.parseInt(weeklyMatch[2]!, 10),
            dayOfWeek: normalizeCronJobDayOfWeek(Number.parseInt(weeklyMatch[3]!, 10)),
        };
    }

    const monthlyMatch = expression.match(MONTHLY_CRON_EXPRESSION_PATTERN);
    if (
        monthlyMatch &&
        isCronJobMinute(monthlyMatch[1]!) &&
        isCronJobHour(monthlyMatch[2]!) &&
        isCronJobDayOfMonth(monthlyMatch[3]!)
    ) {
        return {
            ...cronParts,
            kind: 'monthly',
            minute: Number.parseInt(monthlyMatch[1]!, 10),
            hour: Number.parseInt(monthlyMatch[2]!, 10),
            dayOfMonth: Number.parseInt(monthlyMatch[3]!, 10),
        };
    }

    return { ...cronParts, kind: 'custom' };
}

/**
 * Builds a cron expression from the friendly schedule draft.
 *
 * @param scheduleDraft - Friendly schedule draft.
 * @returns Cron expression.
 */
function createCronJobExpression(scheduleDraft: CronJobScheduleDraft): string {
    const { kind, minute, hour, dayOfWeek, dayOfMonth } = scheduleDraft;

    if (kind === 'hourly') {
        return `${minute} * * * *`;
    }

    if (kind === 'daily') {
        return `${minute} ${hour} * * *`;
    }

    if (kind === 'weekly') {
        return `${minute} ${hour} * * ${dayOfWeek}`;
    }

    if (kind === 'monthly') {
        return `${minute} ${hour} ${dayOfMonth} * *`;
    }

    return `${DEFAULT_CRON_JOB_MINUTE} ${DEFAULT_CRON_JOB_HOUR} * * *`;
}

/**
 * Extracts reusable numeric cron parts from any expression that starts with plain minute/hour values.
 *
 * @param expression - Whitespace-normalized cron expression.
 * @returns Best-effort cron parts.
 */
function parseCronJobExpressionParts(expression: string): Omit<CronJobScheduleDraft, 'kind'> {
    const fields = expression.split(' ');

    return {
        minute: parseCronJobNumberField(fields[0], DEFAULT_CRON_JOB_MINUTE, isCronJobMinute),
        hour: parseCronJobNumberField(fields[1], DEFAULT_CRON_JOB_HOUR, isCronJobHour),
        dayOfWeek: normalizeCronJobDayOfWeek(
            parseCronJobNumberField(fields[4], DEFAULT_CRON_JOB_DAY_OF_WEEK, isCronJobDayOfWeek),
        ),
        dayOfMonth: parseCronJobNumberField(fields[2], DEFAULT_CRON_JOB_DAY_OF_MONTH, isCronJobDayOfMonth),
    };
}

/**
 * Parses one numeric cron field when it is a plain integer inside the expected bounds.
 *
 * @param value - Raw cron field value.
 * @param fallbackValue - Value used when parsing fails.
 * @param isValueAccepted - Bounds check for the parsed value.
 * @returns Parsed cron number or fallback.
 */
function parseCronJobNumberField(
    value: string | undefined,
    fallbackValue: number,
    isValueAccepted: (value: string) => boolean,
): number {
    if (!value || !isValueAccepted(value)) {
        return fallbackValue;
    }

    return Number.parseInt(value, 10);
}

/**
 * Normalizes expression whitespace for matching common schedule shapes.
 *
 * @param value - Raw cron expression.
 * @returns Whitespace-normalized expression.
 */
function normalizeCronJobExpressionWhitespace(value: string): string {
    return value.trim().replace(/\s+/gu, ' ');
}

/**
 * Checks whether a raw value is a valid minute field.
 *
 * @param value - Raw cron token.
 * @returns `true` when the token is an integer minute.
 */
function isCronJobMinute(value: string): boolean {
    return isCronJobNumberInRange(value, 0, 59);
}

/**
 * Checks whether a raw value is a valid hour field.
 *
 * @param value - Raw cron token.
 * @returns `true` when the token is an integer hour.
 */
function isCronJobHour(value: string): boolean {
    return isCronJobNumberInRange(value, 0, 23);
}

/**
 * Checks whether a raw value is a valid day-of-week field.
 *
 * @param value - Raw cron token.
 * @returns `true` when the token is an integer weekday.
 */
function isCronJobDayOfWeek(value: string): boolean {
    return isCronJobNumberInRange(value, 0, 7);
}

/**
 * Checks whether a raw value is a valid day-of-month field.
 *
 * @param value - Raw cron token.
 * @returns `true` when the token is an integer month day.
 */
function isCronJobDayOfMonth(value: string): boolean {
    return isCronJobNumberInRange(value, 1, 31);
}

/**
 * Checks whether a raw token is an integer inside the supplied range.
 *
 * @param value - Raw cron token.
 * @param minimum - Minimum accepted value.
 * @param maximum - Maximum accepted value.
 * @returns `true` when the token is an integer inside the range.
 */
function isCronJobNumberInRange(value: string, minimum: number, maximum: number): boolean {
    if (!/^\d+$/u.test(value)) {
        return false;
    }

    const parsedValue = Number.parseInt(value, 10);

    return parsedValue >= minimum && parsedValue <= maximum;
}

/**
 * Normalizes cron Sunday value `7` to the select option value `0`.
 *
 * @param value - Raw weekday value.
 * @returns Normalized weekday value.
 */
function normalizeCronJobDayOfWeek(value: number): number {
    return value === 7 ? 0 : value;
}

/**
 * Formats a time input value from cron hour/minute values.
 *
 * @param hour - Cron hour.
 * @param minute - Cron minute.
 * @returns Browser time input value.
 */
function formatCronJobTimeInputValue(hour: number, minute: number): string {
    return `${formatCronJobTimePart(hour)}:${formatCronJobTimePart(minute)}`;
}

/**
 * Parses a browser time input value.
 *
 * @param value - Browser time input value.
 * @returns Parsed hour/minute pair or `null` for invalid transient values.
 */
function parseCronJobTimeInputValue(value: string): { readonly hour: number; readonly minute: number } | null {
    const match = value.match(CRON_JOB_TIME_VALUE_PATTERN);

    if (!match) {
        return null;
    }

    return {
        hour: Number.parseInt(match[1]!, 10),
        minute: Number.parseInt(match[2]!, 10),
    };
}

/**
 * Formats a numeric time part for `<input type="time" />`.
 *
 * @param value - Hour or minute value.
 * @returns Two-character time part.
 */
function formatCronJobTimePart(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * Formats one minute option for the hourly schedule selector.
 *
 * @param value - Minute value.
 * @returns User-facing option label.
 */
function formatCronJobMinuteOption(value: number): string {
    return `:${formatCronJobTimePart(value)}`;
}

/**
 * Formats one day-of-month option for the monthly schedule selector.
 *
 * @param value - Day of month.
 * @returns User-facing option label.
 */
function formatCronJobDayOfMonthOption(value: number): string {
    return `${value}. day`;
}
