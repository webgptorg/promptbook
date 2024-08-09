import type { ScriptExecutionTools, ScriptExecutionToolsExecuteOptions } from '../../execution/ScriptExecutionTools';
import type { JavascriptExecutionToolsOptions } from './JavascriptExecutionToolsOptions';
/**
 * ScriptExecutionTools for JavaScript implemented via eval
 *
 * Warning: It is used for testing and mocking
 *          **NOT intended to use in the production** due to its unsafe nature, use `JavascriptExecutionTools` instead.
 *
 * @public exported from `@promptbook/execute-javascript`
 */
export declare class JavascriptEvalExecutionTools implements ScriptExecutionTools {
    private readonly options;
    constructor(options?: JavascriptExecutionToolsOptions);
    /**
     * Executes a JavaScript
     */
    execute(options: ScriptExecutionToolsExecuteOptions): Promise<string>;
}
/**
 * TODO: Put predefined functions (like removeQuotes, spaceTrim, etc.) into annotation OR pass into constructor
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 */
