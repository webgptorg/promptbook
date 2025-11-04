import { string_book } from './string_book';

/**
 *  Number of padding lines to add at the end of the book content
 *
 * @public exported from `@promptbook/core`
 */
export const PADDING_LINES = 4;

/**
 * A function that adds padding to the book content
 *
 * @public exported from `@promptbook/core`
 */
export function padBook(content: string_book): string_book {
    if (!content) {
        return '\n'.repeat(PADDING_LINES) as string_book;
    }

    const lines = content.split('\n');
    let trailingEmptyLines = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];

        if (line === undefined) {
            // Note: This should not happen in reality, but it's here to satisfy TypeScript's noUncheckedIndexedAccess option
            continue;
        }
        if (line.trim() === '') {
            trailingEmptyLines++;
        } else {
            break;
        }
    }

    if (trailingEmptyLines >= PADDING_LINES) {
        return content;
    }

    const linesToAdd = PADDING_LINES - trailingEmptyLines;
    return (content + '\n'.repeat(linesToAdd)) as string_book;
}

/**
 * TODO: [🧠] Maybe export
 */
