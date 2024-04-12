/**
 * Take every whitespace (space, new line, tab) and replace it with a single space.
 */
export function normalizeWhitespaces(sentence: string): string {
    return sentence.replace(/\s+/gs, ' ').trim();
}
