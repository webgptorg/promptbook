import { isValidEmail } from '../utils/validators/email/isValidEmail';
import { isValidFilePath } from '../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../utils/validators/url/isValidUrl';
import { ParseError } from '../errors/ParseError';
import { isValidJsonString } from '../formats/json/utils/isValidJsonString';
import type { PipelineString } from './PipelineString';

/**
 * Function `validatePipelineString` will validate the if the string is a valid pipeline string
 * It does not check if the string is fully logically correct, but if it is a string that can be a pipeline string or the string looks completely different.
 *
 * Note: [🔂] This function is idempotent.
 * 
 * @param {string} pipelineString the candidate for a pipeline string
 * @returns {PipelineString} the same string as input, but validated as valid
 * @throws {ParseError} if the string is not a valid pipeline string
 * @public exported from `@promptbook/core`
 */
export function validatePipelineString(pipelineString: string): PipelineString {
    if (isValidJsonString(pipelineString)) {
        throw new ParseError('Expected a book, but got a JSON string');
    } else if (isValidUrl(pipelineString)) {
        throw new ParseError(`Expected a book, but got just the URL "${pipelineString}"`);
    } else if (isValidFilePath(pipelineString)) {
        throw new ParseError(`Expected a book, but got just the file path "${pipelineString}"`);
    } else if (isValidEmail(pipelineString)) {
        throw new ParseError(`Expected a book, but got just the email "${pipelineString}"`);
    }

    // <- TODO: Implement the validation + add tests when the pipeline logic considered as invalid

    return pipelineString as PipelineString;
}

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 */
