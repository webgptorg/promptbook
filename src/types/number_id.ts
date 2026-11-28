import type { number_integer, number_positive } from './number_positive';

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
