import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';
/**
 * Split text into sentences
 *
 * @public exported from `@promptbook/utils`
 */
export declare function splitIntoSentences(text: string): Array<string>;
/**
 * Counts number of sentences in the text
 *
 * @public exported from `@promptbook/utils`
 */
export declare function countSentences(text: string): ExpectationAmount;
