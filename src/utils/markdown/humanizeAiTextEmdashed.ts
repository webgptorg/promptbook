import { string_markdown } from "../../types/typeAliases";

/**
 * Change em-dashes to regular dashes `—` -> `-`
 *
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiTextEmdashed(aiText: string_markdown): string_markdown {
    return aiText.replace(/—/g, '-');
}

/**
 * Note: [🏂] This function isnt tested by itself but together with other cleanup functions with `humanizeAiText`
 */
