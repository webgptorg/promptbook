import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts number of characters in the text
 */
export function countCharacters(text: string): ExpectationAmount {
    return text.length;
}
