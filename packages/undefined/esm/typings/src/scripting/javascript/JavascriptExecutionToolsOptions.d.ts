import type { Promisable } from 'type-fest';
import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { string_javascript_name } from '../../types/typeAliases';
/**
 * Options for `JavascriptExecutionTools`
 */
export type JavascriptExecutionToolsOptions = CommonExecutionToolsOptions & {
    /**
     * Functions to be executed in the JavaScript evaluation.
     *
     * This can be used in two ways:
     * 1. To provide custom postprocessing functions. For this case function must receive one string and return a (promise of) string.
     * 2. As environment for the ECECUTE SCRIPT, For this case function can be any function. [0]
     *
     * Note: There are also some built-in functions available:
     *      @see ./JavascriptEvalExecutionTools.ts
     */
    functions?: Record<string_javascript_name, PostprocessingFunction>;
};
/**
 * Function that can be used to postprocess the output of the LLM
 */
export type PostprocessingFunction = ((value: string) => Promisable<string>) | Function;
/**
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 */
