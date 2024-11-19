import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';
import { CHARACTERS_PER_STANDARD_LINE } from './config';

/**
 * Counts number of lines in the text
 *
 * Note: This does not check only for the presence of newlines, but also for the length of the standard line.
 *
 * @public exported from `@promptbook/utils`
 */
export function countLines(text: string): ExpectationAmount {
    text = text.replace('\r\n', '\n');
    text = text.replace('\r', '\n');

    const lines = text.split('\n');

    return lines.reduce((count, line) => count + Math.ceil(line.length / CHARACTERS_PER_STANDARD_LINE), 0);
}
