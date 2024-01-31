import type { ExpectationAmount } from '../../types/PromptTemplatePipelineJson/PromptTemplateJson';

/**
 * Counts number of characters in the text
 */
export function countCharacters(text: string): ExpectationAmount {
    text = text.replace(/(\p{Emoji})\p{Modifier_Symbol}/gu, '$1');
    text = text.replace(/(\p{Emoji})[\u{FE00}-\u{FE0F}]/gu, '$1');
    text = text.replace(/\p{Emoji}(\u{200D}\p{Emoji})*/gu, 'x');
    text = text.replace(/\p{Emoji}/gu, 'x');
    return text.length;
}
