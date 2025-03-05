import type { ExpectationAmount } from '../../pipeline/PipelineJson/Expectations';
import { removeDiacritics } from '../normalization/removeDiacritics';

/**
 * Counts number of words in the text
 *
 * @public exported from `@promptbook/utils`
 */
export function countWords(text: string): ExpectationAmount {
    text = text.replace(/[\p{Extended_Pictographic}]/gu, 'a');
    text = removeDiacritics(text);

    // Add spaces before uppercase letters preceded by lowercase letters (for camelCase)
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');

    return text.split(/[^a-zа-я0-9]+/i).filter((word) => word.length > 0).length;
}
