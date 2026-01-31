import type { string_markdown } from '../../types/typeAliases';
import { humanizeAiTextEllipsis } from './humanizeAiTextEllipsis';
import { humanizeAiTextEmdashed } from './humanizeAiTextEmdashed';
import { humanizeAiTextQuotes } from './humanizeAiTextQuotes';
import { humanizeAiTextSources } from './humanizeAiTextSources';
import { humanizeAiTextWhitespace } from './humanizeAiTextWhitespace';

/**
 * Function `humanizeAiText` will remove traces of AI text generation artifacts
 *
 * Note: [🔂] This function is idempotent.
 * Tip: If you want more control, look for other functions for example `humanizeAiTextEmdashed` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiText(aiText: string_markdown): string_markdown {
    let cleanedText = aiText;

    cleanedText = humanizeAiTextEllipsis(cleanedText);
    cleanedText = humanizeAiTextEmdashed(cleanedText);
    cleanedText = humanizeAiTextQuotes(cleanedText);
    cleanedText = humanizeAiTextSources(cleanedText);
    cleanedText = humanizeAiTextWhitespace(cleanedText);

    return cleanedText;
}

/**
 * TODO: [🧠] Maybe this should be exported from `@promptbook/utils` not `@promptbook/markdown-utils`
 */
