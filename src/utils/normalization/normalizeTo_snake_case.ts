import { normalizeTo_SCREAMING_CASE } from './normalizeTo_SCREAMING_CASE';

/**
 * Semantic helper for snake_case strings
 *
 * @example 'hello_world'
 * @example 'i_love_promptbook'
 */
export type string_snake_case = string;

/**
 * Normalizes a text string to snake_case format.
 *
 * @param text The text string to be converted to snake_case format.
 * @returns The normalized text in snake_case format.
 * @example 'hello_world'
 * @example 'i_love_promptbook'
 * @public exported from `@promptbook/utils`
 */
export function normalizeTo_snake_case(text: string): string_snake_case {
    return normalizeTo_SCREAMING_CASE(text).toLowerCase();
}
