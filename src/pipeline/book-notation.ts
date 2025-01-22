import spaceTrim from 'spacetrim';
import type { PipelineString } from './PipelineString';
import { isValidPipelineString } from './isValidPipelineString';
import { prompt } from './prompt-notation';

/**
 * Tag function for notating a pipeline with a book\`...\ notation as template literal
 *
 * Note: There are 2 similar functions:
 * 1) `prompt` for notating single prompt exported from `@promptbook/utils`
 * 1) `book` for notating and validating entire books exported from `@promptbook/utils`
 *
 * @param strings @@@
 * @param values @@@
 * @returns the pipeline string
 * @public exported from `@promptbook/core`
 */
export function book(strings: TemplateStringsArray, ...values: Array<string>): PipelineString {
    const pipelineString = prompt(strings, ...values);

    if (!isValidPipelineString(pipelineString)) {
        // TODO: Make the CustomError for this
        throw new Error(
            spaceTrim(`
                The string is not a valid pipeline string

                book\`
                    ${pipelineString}
                \`
            `),
        );
    }

    return pipelineString;
}

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
