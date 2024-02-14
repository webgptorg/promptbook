/**
 * Removes emojis from a string and fix whitespaces
 *
 * @param text with emojis
 * @returns text without emojis
 */
export function removeEmojis(text: string): string {
    text = ' ' + text + ' ';

    // Replace emojis (and also ZWJ sequence) with hyphens
    text = text.replace(/(\p{Emoji})\p{Modifier_Symbol}/gu, '$1');
    text = text.replace(/(\p{Emoji})[\u{FE00}-\u{FE0F}]/gu, '$1');
    text = text.replace(/(\p{Emoji})(\u{200D}\p{Emoji})*/gu, '$1');

    text = text.replace(/ (\p{Emoji})+ /gu, ' ');
    text = text.replace(/ (\p{Emoji})+/gu, ' ');
    text = text.replace(/(\p{Emoji})+ /gu, ' ');
    text = text.replace(/\p{Emoji}/gu, '');

    return text.trim();
}
