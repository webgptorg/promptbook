/**
 * Take every whitespace (space, new line, tab) and replace it with a single space
 *
 * Note: [🔂] This function is idempotent.
 *
 * @public exported from `@promptbook/utils`
 */
export function normalizeWhitespaces(sentence: string): string {
    return sentence.replace(/\s+/gs, ' ').trim();
}
