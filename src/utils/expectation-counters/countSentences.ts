import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts number of sentences in the text
 */
export function countSentences(text: string): ExpectationAmount {
    return text.split(/[.!?]+/).filter((sentence) => sentence.trim() !== '').length;
}
