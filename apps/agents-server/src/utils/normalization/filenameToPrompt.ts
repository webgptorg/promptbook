import { capitalize } from '@promptbook/utils';

/**
 * Converts a filename like "cat-sitting-on-keyboard.png" to a prompt like "Cat sitting on keyboard"
 *
 * @param filename - The filename to convert
 * @returns The normalized prompt
 */
export function filenameToPrompt(filename: string): string {
    // Remove attachments hash
    const cleanFilename = filename.replace(/-attach-[a-z0-9]+/, '');

    // Remove file extension
    const withoutExtension = cleanFilename.replace(/\.[^/.]+$/, '');

    // Replace dashes and underscores with spaces
    const withSpaces = withoutExtension.replace(/[-_]/g, ' ');

    // Capitalize each word
    const words = withSpaces.split(' ').filter((word) => word !== '');
    const capitalizedWords = words.map((word, index) => (index === 0 ? capitalize(word) : word.toLowerCase()));

    return capitalizedWords.join(' ');
}

/**
 * TODO: [🧠][🏰] Make standard normalization function exported from `@promptbook/utils`
 */
