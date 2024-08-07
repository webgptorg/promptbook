import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';
import { removeDiacritics } from '../normalization/removeDiacritics';

/**
 * Counts number of words in the text
 *
 * @public exported from `@promptbook/utils`
 */
export function countWords(text: string): ExpectationAmount {
    text = text.replace(/[\p{Extended_Pictographic}]/gu, 'a');
    text = removeDiacritics(text);

    return text.split(/[^a-zа-я0-9]+/i).filter((word) => word.length > 0).length;
}
