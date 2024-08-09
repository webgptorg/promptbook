/**
 * Function trimEndOfCodeBlock will remove ending code block from the string if it is present.
 *
 * Note: This is usefull for post-processing of the result of the completion LLM model
 *       if you want to start code block in the prompt but you don't want to end it in the result.
 *
 * @public exported from `@promptbook/utils`
 */
export declare function trimEndOfCodeBlock(value: string): string;
