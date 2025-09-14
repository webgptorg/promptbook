import type { ExpectationAmount } from '../../pipeline/PipelineJson/Expectations';

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

/**
 * TODO: [🥴] Implement counting in formats - like JSON, CSV, XML,...
 * TODO: [🧠][✌️] Make some Promptbook-native token system
 */
