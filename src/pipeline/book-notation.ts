import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../errors/NotYetImplementedError';
import { keepUnused } from '../utils/organization/keepUnused';
import { PipelineString } from './PipelineString';
import { isValidPipelineString } from './isValidPipelineString';

/**
 * Function for notating a pipeline with a book\`...\ notation as template literal
 *
 * @param strings @@@
 * @param values @@@
 * @returns the pipeline string
 * @public exported from `@promptbook/core`
 */
export function book(strings: TemplateStringsArray, ...values: Array<string>): PipelineString {
    if (strings.length !== 1 && values.length !== 0) {
        throw new NotYetImplementedError(
            `Only one string without interpolated value is supported for now in book\`...\` notation`,
        );
    }

    let pipelineString = strings[0]!;
    pipelineString = spaceTrim(pipelineString);

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

keepUnused(book`
      !!!!!! Remove
`);

/**
 * TODO: !!!!!! Use book\`...\ notation instead of as PipelineString
 * TODO: [🧠][🈴] Where is the best location for this file
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
