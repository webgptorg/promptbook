import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';

/**
 * Counts number of lines in the text
 * 
 * @public exported from `@promptbook/utils`
 */
export function countLines(text: string): ExpectationAmount {
    if (text === '') {
        return 0;
    }

    return text.split('\n').length;
}
