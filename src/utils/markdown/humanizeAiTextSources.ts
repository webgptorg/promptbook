import type { string_markdown } from '../../types/typeAliases';

/**
 * Remove bracketed source citation artifacts like `\u30105:1\u2020source\u3011`.
 *
 * Note: [??] This function is idempotent.
 * Tip: If you want to do the full cleanup, look for `humanizeAiText` exported `@promptbook/markdown-utils`
 */
export function humanizeAiTextSources(aiText: string_markdown): string_markdown {
    return aiText.replace(/[ \t]*\u3010\s*\d+(?:\s*:\s*\d+)?\s*\u2020source\s*\u3011/g, '');
}

/**
 * Note: [??] This function is not tested by itself but together with other cleanup functions with `humanizeAiText`
 */
