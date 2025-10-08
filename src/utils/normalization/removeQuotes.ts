/**
 * Removes quotes from a string
 *
 * Note: [🔂] This function is idempotent.
 * Tip: This is very useful for post-processing of the result of the LLM model
 * Note: This function removes only the same quotes from the beginning and the end of the string
 * Note: There are two similar functions:
 * - `removeQuotes` which removes only bounding quotes
 * - `unwrapResult` which removes whole introduce sentence
 *
 * @param text optionally quoted text
 * @returns text without quotes
 * @public exported from `@promptbook/utils`
 */
export function removeQuotes(text: string): string {
    if (text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1);
    }

    if (text.startsWith("'") && text.endsWith("'")) {
        return text.slice(1, -1);
    }

    return text;
}
