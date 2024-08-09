import type { ExpectationAmount } from '../../types/PipelineJson/Expectations';

/**
 * Counts number of paragraphs in the text
 * 
 * @public exported from `@promptbook/utils`
 */
export function countParagraphs(text: string): ExpectationAmount {
    return text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim() !== '').length;
}
