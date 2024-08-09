/**
 * Removes quotes from a string
 *
 * Tip: This is very usefull for post-processing of the result of the LLM model
 * Note: This function removes only the same quotes from the beginning and the end of the string
 * Note: There are two simmilar functions:
 * - `removeQuotes` which removes only bounding quotes
 * - `unwrapResult` which removes whole introduce sentence
 *
 * @param text optionally quoted text
 * @returns text without quotes
 * @public exported from `@promptbook/utils`
 */
export declare function removeQuotes(text: string): string;
