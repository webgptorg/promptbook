import spaceTrim from 'spacetrim';

/**
 * Removes quotes and optional introduce text from a string
 *
 * Tip: This is very usefull for post-processing of the result of the LLM model
 * Note: This function trims the text and removes whole introduce sentence if it is present
 * Note: There are two simmilar functions:
 * - `removeQuotes` which removes only bounding quotes
 * - `unwrapResult` which removes whole introduce sentence
 *
 * @param text optionally quoted text
 * @returns text without quotes
 */
export function unwrapResult(text: string): string {
    const originalText = text;

    // Remove leading and trailing spaces and newlines
    text = spaceTrim(text);

    // Check if the text starts with a sentence followed by quotes
    const introduceSentenceRegex = /^[^"'\n]*/;
    if (introduceSentenceRegex.test(text)) {
        // Remove the introduce sentence and quotes by replacing it with an empty string
        text = text.replace(introduceSentenceRegex, '');
    }

    text = spaceTrim(text);

    if (text.length < 3) {
        return originalText;
    }

    // Remove the quotes by extracting the substring without the first and last characters
    const unquotedText = text.slice(1, -1);

    // Check if the text starts and ends with quotes
    if (
        (text.startsWith('\'') && !unquotedText.includes('\'') && text.endsWith('\'')) ||
        (text.startsWith('"') && !unquotedText.includes('"') && text.endsWith('"'))
    ) {
        return unquotedText;
    } else {
        return originalText;
    }
}
