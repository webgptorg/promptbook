import type { string_markdown } from '../../types/typeAliases';

/**
 * Change unprintable hard spaces to regular spaces and drop zero-width spaces
 *
 * Note: [🔂] This function is idempotent.
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextWhitespace(aiText: string_markdown): string_markdown {
    return aiText
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/[\u200B\uFEFF\u2060]/g, '');
}

/**
 * Note: [🏂] This function is not tested by itself but together with other cleanup functions with `humanizeAiText`
 */
