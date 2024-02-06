import { string_name, string_script } from '.././types/typeAliases';
import { ScriptLanguage } from '../types/ScriptLanguage';

/**
 * Represents all the tools needed to EXECUTE SCRIPTs
 *
 * @see https://github.com/webgptorg/promptbook#script-execution-tools
 */
export interface ScriptExecutionTools {
    execute(options: ScriptExecutionToolsExecuteOptions): Promise<string>;
}

/**
 * Input for the script execution
 */
export interface ScriptExecutionToolsExecuteOptions {
    /**
     * Language of the script
     */
    scriptLanguage: ScriptLanguage;

    /**
     * Parameters for the script
     * Theese parameters are passed to the script as variables
     * For example: { "name": "John" } => const name = "John";
     */
    parameters: Record<string_name, string>;

    /**
     * The content of the script to execute
     * - It can be a single statement
     * - It can be multiple statements separated by semicolon and return
     * - It can be a function (but you need to call it)
     * - It can be IIFE (immediately invoked function expression)
     * - It can use the parameters as variables and functions from global scope
     */
    script: string_script;
}


/**
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 */