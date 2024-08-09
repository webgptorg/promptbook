import type { ScriptLanguage } from '../types/ScriptLanguage';
import type { Parameters } from '../types/typeAliases';
import type { string_script } from '../types/typeAliases';
/**
 * Represents all the tools needed to EXECUTE SCRIPTs
 *
 * @see https://github.com/webgptorg/promptbook#script-execution-tools
 */
export type ScriptExecutionTools = {
    execute(options: ScriptExecutionToolsExecuteOptions): Promise<string>;
};
/**
 * Input for the script execution
 */
export type ScriptExecutionToolsExecuteOptions = {
    /**
     * Language of the script
     */
    readonly scriptLanguage: ScriptLanguage;
    /**
     * Parameters for the script
     * Theese parameters are passed to the script as variables
     * For example: { "name": "John" } => const name = "John";
     */
    readonly parameters: Parameters;
    /**
     * The content of the script to execute
     * - It can be a single statement
     * - It can be multiple statements separated by semicolon and return
     * - It can be a function (but you need to call it)
     * - It can be IIFE (immediately invoked function expression)
     * - It can use the parameters as variables and functions from global scope
     */
    readonly script: string_script;
};
/**
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 * TODO: [🧠][🪐] Should be common things like types, utils in folder containing A,B,C,.. or else outside this listing folder?
 */
