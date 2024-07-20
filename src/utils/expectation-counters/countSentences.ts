import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): Array<string> {
    return text.split(/[.!?]+/).filter((sentence) => sentence.trim() !== '');
}

/**
 * Counts number of sentences in the text
 */
export function countSentences(text: string): ExpectationAmount {
    return splitIntoSentences(text).length;
}
