import spaceTrim from 'spacetrim';
import { padBook } from '../book-2.0/agent-source/padBook';
import type { string_book } from '../book-2.0/agent-source/string_book';
import { isValidBook } from '../book-2.0/agent-source/string_book';
import type { PipelineString } from './PipelineString';
import { isValidPipelineString } from './isValidPipelineString';
import { prompt } from './prompt-notation';

/**
 * Tag function for notating a pipeline with a book\`...\ notation as template literal
 *
 * Note: There are 3 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 2) `promptTemplate` alias for `prompt`
 * 3) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @param strings The static string parts of the template literal
 * @param values The dynamic values embedded within the template literal used as data
 * @returns the pipeline string
 * @public exported from `@promptbook/core`
 */
export function book(strings: TemplateStringsArray, ...values: Array<string>): string_book & PipelineString {
    const bookString = prompt(strings, ...values);

    if (!isValidPipelineString(bookString)) {
        // TODO: Make the CustomError for this
        throw new Error(
            spaceTrim(`
                The string is not a valid pipeline string

                book\`
                    ${bookString}
                \`
            `),
        );
    }

    if (!isValidBook(bookString)) {
        // TODO: Make the CustomError for this
        throw new Error(
            spaceTrim(`
                The string is not a valid book

                book\`
                    ${bookString}
                \`
            `),
        );
    }

    return padBook(bookString) as string_book & PipelineString;
}

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
