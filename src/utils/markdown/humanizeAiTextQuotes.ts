import type { string_markdown } from '../../types/string_markdown';

/**
 * Change smart quotes to regular quotes
 *
 * Note: [🔂] This function is idempotent.
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextQuotes(aiText: string_markdown): string_markdown {
    return aiText.replace(/[“”„‟«»❝❞〝〞〟＂]/g, '"').replace(/[‚‘’‛‹›❛❜＇ʼ]/g, "'");
}

// Note: [🏂] This function is not tested by itself but together with other cleanup functions with `humanizeAiText`
