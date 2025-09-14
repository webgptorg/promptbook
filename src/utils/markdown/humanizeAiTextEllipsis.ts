import { string_markdown } from '../../types/typeAliases';

/**
 * Change ellipsis character to three dots `…` -> `...`
 *
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextEllipsis(aiText: string_markdown): string_markdown {
    return aiText.replace(/…/g, '...');
}

/**
 * Note: [🏂] This function is not tested by itself but together with other cleanup functions with `humanizeAiText`
 */
