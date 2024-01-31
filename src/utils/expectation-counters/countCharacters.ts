import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts number of characters in the text
 */
export function countCharacters(text: string): ExpectationAmount {
    // Remove null characters
    text = text.replace(/\0/g, '');

    // Replace emojis (and also ZWJ sequence) with hyphens
    text = text.replace(/(\p{Emoji})\p{Modifier_Symbol}/gu, '$1');
    text = text.replace(/(\p{Emoji})[\u{FE00}-\u{FE0F}]/gu, '$1');
    text = text.replace(/\p{Emoji}(\u{200D}\p{Emoji})*/gu, '-');

    return text.length;
}
