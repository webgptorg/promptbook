import { cleanupAiTextEllipsis } from './cleanupAiTextEllipsis';
import { cleanupAiTextEmdashed } from './cleanupAiTextEmdashed';
import { cleanupAiTextQuotes } from './cleanupAiTextQuotes';
import { cleanupAiTextWhitespace } from './cleanupAiTextWhitespace';

/**
 * Function `cleanupAiText` will remove traces of AI text generation artifacts
 *
 * Tip: If you want more control, look for other functions for example `cleanupAiTextEmdashed` exported `@promptbook/markdown-utils`
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function cleanupAiText(aiText: string): string {
    let cleanedText = aiText;

    cleanedText = cleanupAiTextEllipsis(cleanedText);
    cleanedText = cleanupAiTextEmdashed(cleanedText);
    cleanedText = cleanupAiTextQuotes(cleanedText);
    cleanedText = cleanupAiTextWhitespace(cleanedText);

    return cleanedText;
}
