import spaceTrim from 'spacetrim';
import { padBook } from './padBook';

/**
 * Branded type for books
 */
export type string_book = string & { readonly __type: 'book' };

/**
 * Type guard to check if a string is a valid agent source
 *
 * @public exported from `@promptbook/core`
 */
export function isValidBook(value: string): value is string_book {
    // Basic validation - agent source should have at least a name (first line)
    return typeof value === 'string' /* && value.trim().length > 0 */;
}

/**
 * Validates and converts a string to agent source branded type
 * This function should be used when you have a string that you know represents agent source
 * but need to convert it to the branded type for type safety
 *
 * @public exported from `@promptbook/core`
 */
export function validateBook(source: string): string_book {
    if (!isValidBook(source)) {
        throw new Error('Invalid agent source: must be a string');
    }
    return source as string_book;
}

/**
 * Default book
 *
 * @deprecated Use `$generateBookBoilerplate` instead
 * @public exported from `@promptbook/core`
 */
export const DEFAULT_BOOK = padBook(
    validateBook(
        spaceTrim(`
            AI Avatar

            PERSONA A friendly AI assistant that helps you with your tasks
        `),
    ),
);
// <- Note: Not using book`...` notation to avoid strange error in jest unit tests `TypeError: (0 , book_notation_1.book) is not a function`

// <- TODO: !!! `GENESIS_BOOK` / `ADAM_BOOK` in `/agents/adam.book`
//                  <- !!! Buttons into genesis book
// <- TODO: !!! generateBookBoilerplate and deprecate `DEFAULT_BOOK`
