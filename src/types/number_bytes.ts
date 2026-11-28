import type { number_integer, number_positive } from './number_positive';

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
