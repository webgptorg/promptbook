import type { string_markdown_text } from '../../types/typeAliases';

/**
 * Removes Markdown formatting tags from a string.
 *
 * @param {string} str - The string to remove Markdown tags from.
 * @returns {string} The input string with all Markdown tags removed.
 */
export function removeMarkdownFormatting(str: string_markdown_text): string {
    // Remove bold formatting
    str = str.replace(/\*\*(.*?)\*\*/g, '$1');

    // Remove italic formatting
    str = str.replace(/\*(.*?)\*/g, '$1');

    // Remove code formatting
    str = str.replace(/`(.*?)`/g, '$1');

    return str;
}
