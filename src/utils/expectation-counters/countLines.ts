import type { ExpectationAmount } from '../../types/PromptbookJson/PromptTemplateJson';

/**
 * Counts number of lines in the text
 */
export function countLines(text: string): ExpectationAmount {
    if (text === '') {
        return 0;
    }

    return text.split('\n').length;
}
