import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';
import { countCharacters } from './countCharacters';
import { countLines } from './countLines';

/**
 * Counts number of pages in the text
 *
 * @public exported from `@promptbook/utils`
 */
export function countPages(text: string): ExpectationAmount {
    if (text === '') {
        return 0;
    }

    const pagesByLinesCount = Math.ceil(countLines(text) / 44);
    const pagesByCharactersCount = Math.ceil(countCharacters(text) / 2772);

    return Math.max(pagesByLinesCount, pagesByCharactersCount);
}
