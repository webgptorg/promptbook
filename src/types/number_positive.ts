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
