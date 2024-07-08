import type { ExpectationAmount } from '../../types/PipelineJson/PromptTemplateJson';

/**
 * Counts number of pages in the text
 */
export function countPages(text: string): ExpectationAmount {
    const sentencesPerPage = 5; // Assuming each page has 5 sentences
    const sentences = text.split(/[.!?]+/).filter((sentence) => sentence.trim() !== '');
    const pageCount = Math.ceil(sentences.length / sentencesPerPage);
    return pageCount;
}
