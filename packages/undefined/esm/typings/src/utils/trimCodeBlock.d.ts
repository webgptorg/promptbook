/**
 * Function trimCodeBlock will trim starting and ending code block from the string if it is present.
 *
 * Note: This is usefull for post-processing of the result of the chat LLM model
 *       when the model wraps the result in the (markdown) code block.
 *
 * @public exported from `@promptbook/utils`
 */
export declare function trimCodeBlock(value: string): string;
