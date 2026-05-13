import type { string_markdown } from '../../types/string_markdown';

/**
 * Change ellipsis characters and dot leaders to three dots `…` -> `...`
 *
 * Note: [🔂] This function is idempotent.
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextEllipsis(aiText: string_markdown): string_markdown {
    return aiText.replace(/[…⋯]/g, '...').replace(/\.\s+\.\s+\./g, '...');
}

// Note: [🏂] This function is not tested by itself but together with other cleanup functions with `humanizeAiText`
