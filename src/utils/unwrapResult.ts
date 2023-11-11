import spaceTrim from 'spacetrim';

/**
 * Additional options for `unwrapResult`
 */
interface UnwrapResultOptions {
    /**
     * If true, the text is trimmed before processing
     */
    isTrimmed?: boolean;

    /**
     * If true, the introduce sentence is removed
     *
     * For example:
     * - If `true`>  'Hello, "world"' -> 'world'
     * - If `false`> 'Hello, "world"' -> 'Hello, "world"'
     *
     * @default true
     */
    isIntroduceSentenceRemoved?: boolean;
}

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
export function unwrapResult(text: string, options?: UnwrapResultOptions): string {
    const { isTrimmed = true, isIntroduceSentenceRemoved = true } = options || {};

    const originalText = text;

    // Remove leading and trailing spaces and newlines
    if (isTrimmed) {
        text = spaceTrim(text);
    }

    if (isIntroduceSentenceRemoved) {
        const introduceSentenceRegex = /^[a-zěščřžýáíéúů:\s]*/i;
        if (introduceSentenceRegex.test(text)) {
            // Remove the introduce sentence and quotes by replacing it with an empty string
            text = text.replace(introduceSentenceRegex, '');
        }
        text = spaceTrim(text);
    }

    if (text.length < 3) {
        return originalText;
    }

    if (text.includes('\n')) {
        return originalText;
    }

    // Remove the quotes by extracting the substring without the first and last characters
    const unquotedText = text.slice(1, -1);

    // Check if the text starts and ends with quotes

    if (
        (
            [
                ['"', '"'],
                ["'", "'"],
                ['`', '`'],
                ['*', '*'],
                ['_', '_'],
                ['„', '“'],
                ['«', '»'] /* <- QUOTES to config */,
            ] as const
        ).some(([startQuote, endQuote]) => {
            if (!text.startsWith(startQuote)) {
                return false;
            }

            if (!text.endsWith(endQuote)) {
                return false;
            }

            if (unquotedText.includes(startQuote) && !unquotedText.includes(endQuote)) {
                return false;
            }

            if (!unquotedText.includes(startQuote) && unquotedText.includes(endQuote)) {
                return false;
            }

            return true;
        })
    ) {
        return unwrapResult(unquotedText, { isTrimmed: false, isIntroduceSentenceRemoved: false });
    } else {
        return originalText;
    }
}

/**
 * TODO: [🧠] Should this also unwrap the (parenthesis)
 */
