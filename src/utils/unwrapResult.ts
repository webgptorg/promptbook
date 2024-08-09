import { spaceTrim } from 'spacetrim';

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
 * @public exported from `@promptbook/utils`
 */
export function unwrapResult(text: string, options?: UnwrapResultOptions): string {
    const { isTrimmed = true, isIntroduceSentenceRemoved = true } = options || {};

    let trimmedText = text;

    // Remove leading and trailing spaces and newlines
    if (isTrimmed) {
        trimmedText = spaceTrim(trimmedText);
    }

    let processedText = trimmedText;

    if (isIntroduceSentenceRemoved) {
        const introduceSentenceRegex = /^[a-zěščřžýáíéúů:\s]*:\s*/i;
        if (introduceSentenceRegex.test(text)) {
            // Remove the introduce sentence and quotes by replacing it with an empty string
            processedText = processedText.replace(introduceSentenceRegex, '');
        }
        processedText = spaceTrim(processedText);
    }

    if (processedText.length < 3) {
        return trimmedText;
    }

    if (processedText.includes('\n')) {
        return trimmedText;
    }

    // Remove the quotes by extracting the substring without the first and last characters
    const unquotedText = processedText.slice(1, -1);

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
            if (!processedText.startsWith(startQuote)) {
                return false;
            }

            if (!processedText.endsWith(endQuote)) {
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
        return processedText;
    }
}

/**
 * TODO: [🧠] Should this also unwrap the (parenthesis)
 */
