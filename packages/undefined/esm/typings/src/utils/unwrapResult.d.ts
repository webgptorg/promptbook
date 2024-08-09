/**
 * Additional options for `unwrapResult`
 */
interface UnwrapResultOptions {
    /**
     * If true, the text is trimmed before processing
     */
    isTrimmed?: boolean;
    /**
     * If true, the introduce sentence is removed
     *
     * For example:
     * - If `true`>  'Hello, "world"' -> 'world'
     * - If `false`> 'Hello, "world"' -> 'Hello, "world"'
     *
     * @default true
     */
    isIntroduceSentenceRemoved?: boolean;
}
/**
 * Removes quotes and optional introduce text from a string
 *
 * Tip: This is very usefull for post-processing of the result of the LLM model
 * Note: This function trims the text and removes whole introduce sentence if it is present
 * Note: There are two simmilar functions:
 * - `removeQuotes` which removes only bounding quotes
 * - `unwrapResult` which removes whole introduce sentence
 *
 * @param text optionally quoted text
 * @returns text without quotes
 * @public exported from `@promptbook/utils`
 */
export declare function unwrapResult(text: string, options?: UnwrapResultOptions): string;
export {};
/**
 * TODO: [🧠] Should this also unwrap the (parenthesis)
 */
