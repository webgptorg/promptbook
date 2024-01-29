import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts mumber of characters in the text
 */

export function countCharacters(text: string): ExpectationAmount {
    return text.length; /* <- TODO: Maybe better according to UTF-8? */
}
