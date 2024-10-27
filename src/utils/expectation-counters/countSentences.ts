import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';

/**
 * Split text into sentences
 *
 * @public exported from `@promptbook/utils`
 */
export function splitIntoSentences(text: string): ReadonlyArray<string> {
    return text.split(/[.!?]+/).filter((sentence) => sentence.trim() !== '');
}

/**
 * Counts number of sentences in the text
 *
 * @public exported from `@promptbook/utils`
 */
export function countSentences(text: string): ExpectationAmount {
    return splitIntoSentences(text).length;
}
