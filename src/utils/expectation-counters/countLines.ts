import type { ExpectationAmount } from '../../pipeline/PipelineJson/Expectations';
import { CHARACTERS_PER_STANDARD_LINE } from './constants';

/**
 * Counts number of lines in the text
 *
 * Note: This does not check only for the presence of newlines, but also for the length of the standard line.
 *
 * @public exported from `@promptbook/utils`
 */
export function countLines(text: string): ExpectationAmount {
    if (text === '') {
        return 0;
    }

    text = text.replace('\r\n', '\n');
    text = text.replace('\r', '\n');

    const lines = text.split(/\r?\n/);

    return lines.reduce((count, line) => count + Math.max(Math.ceil(line.length / CHARACTERS_PER_STANDARD_LINE), 1), 0);
}

/**
 * TODO: [🥴] Implement counting in formats - like JSON, CSV, XML,...
 * TODO: [🧠][✌️] Make some Promptbook-native token system
 */
