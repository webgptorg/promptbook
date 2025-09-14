/**
 * Change em-dashes to regular dashes `—` -> `-`
 *
 * Tip: If you want to do the full cleanup, look for `cleanupAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function cleanupAiTextEmdashed(aiText: string): string {
    return aiText.replace(/—/g, '-');
}

/**
 * Note: [🏂] This function isnt tested by itself but together with other cleanup functions with `cleanupAiText`
 */
