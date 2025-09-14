import type { ExpectationAmount } from '../../pipeline/PipelineJson/Expectations';

/**
 * Counts number of paragraphs in the text
 *
 * @public exported from `@promptbook/utils`
 */
export function countParagraphs(text: string): ExpectationAmount {
    return text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim() !== '').length;
}


/**
 * TODO: [🥴] Implement counting in formats - like JSON, CSV, XML,...
 * TODO: [🧠][✌️] Make some Promptbook-native token system
 */
