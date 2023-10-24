import spaceTrim from 'spacetrim';
import { EMOJIS } from './emojis';

/**
 * Removes emojis from a string and fix whitespaces
 *
 * @param text with emojis
 * @returns text without emojis
 */
export function removeEmojis(text: string): string {
    text = ' ' + text + ' ';
    for (const emoji of Array.from(EMOJIS)) {
        text = text.split(` ${emoji} `).join(' ');
        text = text.split(` ${emoji}`).join(' ');
        text = text.split(`${emoji} `).join(' ');
        text = text.split(emoji).join('');
    }
    text = spaceTrim(text);
    return text;
}
