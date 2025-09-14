import { string_markdown } from '../../types/typeAliases';
import { humanizeAiTextEllipsis } from './humanizeAiTextEllipsis';
import { humanizeAiTextEmdashed } from './humanizeAiTextEmdashed';
import { humanizeAiTextQuotes } from './humanizeAiTextQuotes';
import { humanizeAiTextWhitespace } from './humanizeAiTextWhitespace';

/**
 * Function `humanizeAiText` will remove traces of AI text generation artifacts
 *
 * Tip: If you want more control, look for other functions for example `humanizeAiTextEmdashed` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function humanizeAiText(aiText: string_markdown): string_markdown {
    let cleanedText = aiText;

    cleanedText = humanizeAiTextEllipsis(cleanedText);
    cleanedText = humanizeAiTextEmdashed(cleanedText);
    cleanedText = humanizeAiTextQuotes(cleanedText);
    cleanedText = humanizeAiTextWhitespace(cleanedText);

    return cleanedText;
}

/**
 * TODO: [🔂] !!! Use this across the project where AI text is involved
 */
