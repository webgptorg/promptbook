/**
 * Removes emojis from a string and fix whitespaces
 *
 * @param text with emojis
 * @returns text without emojis
 * @public exported from `@promptbook/utils`
 */
export function removeEmojis(text: string): string {
    // Replace emojis (and also ZWJ sequence) with hyphens
    text = text.replace(/(\p{Extended_Pictographic})\p{Modifier_Symbol}/gu, '$1');
    text = text.replace(/(\p{Extended_Pictographic})[\u{FE00}-\u{FE0F}]/gu, '$1');
    text = text.replace(/(\p{Extended_Pictographic})(\u{200D}\p{Extended_Pictographic})*/gu, '$1');

    text = text.replace(/\p{Extended_Pictographic}/gu, '');

    return text;
}
