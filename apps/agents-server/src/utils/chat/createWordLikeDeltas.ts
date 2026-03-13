/**
 * Splits text into word-like streaming deltas while preserving whitespace.
 */
export function createWordLikeDeltas(content: string): Array<string> {
    return content.match(/\S+\s*|\s+/g) || [];
}
