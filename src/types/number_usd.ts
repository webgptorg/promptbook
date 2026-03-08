/**
 * Semantic helper for US Dollars
 */
export type number_usd = number;

/**
 * Semantic helper for incremental IDs
 */
export type number_id = number_integer & (number_positive | 0);

/**
 * Semantic helper for number of rows and columns
 */
export type number_linecol_number = number_integer & number_positive;

/**
 * Semantic helper for number of tokens
 */
export type number_tokens = number_integer & (number_positive | 0);

/**
 * Positive number helper.
 */
export type number_positive = number;

/**
 * Negative number helper.
 */
export type number_negative = number;

/**
 * Integer number helper.
 */
export type number_integer = number;

/**
 * TCP/UDP port helper.
 */
export type number_port = number_positive & number_integer;

/**
 * Semantic helper;
 * Percentage from 0 to 1 (100%) (and below and above)
 */
export type number_percent = number;

/**
 * Semantic helper;
 * Model temperature
 */
export type number_model_temperature = number_percent;

/**
 * Semantic helper;
 * Seed for random generator
 *
 * Percentage from 0 to 1 (100%)
 * TODO: Is seed (in OpenAI) number from 0 to 1?
 */
export type number_seed = number_percent;

/**
 * Likeness of the wallpaper
 *
 * - 👍 is equivalent to 1
 * - 👎 is equivalent to -1
 * - ❤ is equivalent to more than 1
 */
export type number_likeness = number;

/**
 * Milliseconds helper.
 */
export type number_milliseconds = number_integer;

/**
 * Seconds helper.
 */
export type number_seconds = number;

/**
 * Minutes helper.
 */
export type number_minutes = number;

/**
 * Hours helper.
 */
export type number_hours = number;

/**
 * Days helper.
 */
export type number_days = number;

/**
 * Weeks helper.
 */
export type number_weeks = number;

/**
 * Months helper.
 */
export type number_months = number;

/**
 * Years helper.
 */
export type number_years = number;

/**
 * Byte count helper.
 */
export type number_bytes = number_integer & number_positive;

/**
 * Kilobyte count helper.
 */
export type number_kilobytes = number_positive;

/**
 * Megabyte count helper.
 */
export type number_megabytes = number_positive;

/**
 * Gigabyte count helper.
 */
export type number_gigabytes = number_positive;

/**
 * Terabyte count helper.
 */
export type number_terabytes = number_positive;
