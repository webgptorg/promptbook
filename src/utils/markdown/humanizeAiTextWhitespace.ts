/**
 * Change unprintable hard spaces to regular spaces
 *
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextWhitespace(aiText: string): string {
    return aiText.replace(/\u00A0/g, ' ');
}

/**
 * Note: [🏂] This function isnt tested by itself but together with other cleanup functions with `humanizeAiText`
 */
