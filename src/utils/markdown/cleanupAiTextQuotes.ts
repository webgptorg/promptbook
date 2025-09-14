/**
 * Change smart quotes to regular quotes
 *
 * Tip: If you want to do the full cleanup, look for `cleanupAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function cleanupAiTextQuotes(aiText: string): string {
    return aiText
        .replace(/[“”]/g, '"')
        .replace(/[‚‘’]/g, "'")
        .replace(/«/g, '"')
        .replace(/»/g, '"')
        .replace(/„/g, '"')
        .replace(/‹/g, "'")
        .replace(/›/g, "'");
}

/**
 * Note: [🏂] This function isnt tested by itself but together with other cleanup functions with `cleanupAiText`
 */
