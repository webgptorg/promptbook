import { normalizeTo_camelCase } from './normalizeTo_camelCase';

/**
 * Semantic helper for PascalCase strings
 *
 * @example 'HelloWorld'
 * @example 'ILovePromptbook'
 * @public exported from `@promptbook/utils`
 */
export type string_PascalCase = string;

/**
 * Normalizes a given text to PascalCase format.
 *
 * Note: [🔂] This function is idempotent.
 *
 * @param text @public exported from `@promptbook/utils`
 * @returns
 * @example 'HelloWorld'
 * @example 'ILovePromptbook'
 * @public exported from `@promptbook/utils`
 */
export function normalizeTo_PascalCase(text: string): string_PascalCase {
    return normalizeTo_camelCase(text, true);
}
