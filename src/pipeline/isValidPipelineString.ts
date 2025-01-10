import { PipelineString } from './PipelineString';

/**
 * Function `isValidPipelineString` will validate the if the string is a valid pipeline string
 * It does not check if the string is fully logically correct, but if it is a string that can be a pipeline string or the string looks completely different.
 *
 * @public exported from `@promptbook/core`
 */
export function isValidPipelineString(value: string): value is PipelineString {
    // TODO: !!!!!! Implement the validation + add false tests
    return true;
}

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 */
