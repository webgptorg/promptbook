import { removeDiacritics } from 'n12';
import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts number of words in the text
 */
export function countWords(text: string): ExpectationAmount {
    text = text.replace(/[\p{Emoji}]/gu, 'a');
    text = removeDiacritics(text);

    return text.split(/[^a-zа-я0-9]+/i).filter((word) => word.length > 0).length;
}
