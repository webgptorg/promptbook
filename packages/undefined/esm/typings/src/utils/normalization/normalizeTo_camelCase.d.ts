/**
 * Semantic helper for camelCase strings
 *
 * @example 'helloWorld'
 * @example 'iLovePromptbook'
 * @public exported from `@promptbook/utils`
 */
export type string_camelCase = string;
/**
 * @@@
 *
 * @param text @@@
 * @param _isFirstLetterCapital @@@
 * @returns @@@
 * @example 'helloWorld'
 * @example 'iLovePromptbook'
 * @public exported from `@promptbook/utils`
 */
export declare function normalizeTo_camelCase(text: string, _isFirstLetterCapital?: boolean): string_camelCase;
/**
 * TODO: [🌺] Use some intermediate util splitWords
 */
