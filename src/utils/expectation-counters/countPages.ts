import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';
import { LINES_PER_STANDARD_PAGE } from './config';
import { countLines } from './countLines';

/**
 * Counts number of pages in the text
 *
 * Note: This does not check only for the count of newlines, but also for the length of the standard line and length of the standard page.
 *
 * @public exported from `@promptbook/utils`
 */
export function countPages(text: string): ExpectationAmount {
    return Math.ceil(countLines(text) / LINES_PER_STANDARD_PAGE);
}
