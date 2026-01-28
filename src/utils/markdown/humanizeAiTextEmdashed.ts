import type { string_markdown } from '../../types/typeAliases';

/**
 * Change dash-like characters to regular dashes `—` -> `-` and remove soft hyphens
 *
 * Note: [🔂] This function is idempotent.
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextEmdashed(aiText: string_markdown): string_markdown {
    return aiText.replace(/\u00AD/g, '').replace(/[‐‑‒–—―−⁃﹣－]/g, '-');
}

/**
 * Note: [🏂] This function is not tested by itself but together with other cleanup functions with `humanizeAiText`
 */
