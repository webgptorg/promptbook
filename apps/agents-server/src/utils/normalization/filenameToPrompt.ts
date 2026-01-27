import { capitalize } from '@promptbook/utils';

/**
 * Converts a filename like "cat-sitting-on-keyboard.png" to a prompt like "Cat sitting on keyboard"
 *
 * @param filename - The filename to convert
 * @returns The normalized prompt
 */
export function filenameToPrompt(filename: string): string {
    // Remove file extension
    const withoutExtension = filename.replace(/\.[^/.]+$/, '');

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
