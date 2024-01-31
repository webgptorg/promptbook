import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts number of words in the text
 */
export function countWords(text: string): ExpectationAmount {
    if (text === '') {
        return 0;
    }

    return text.trim().split(/\s+/).length;
}
