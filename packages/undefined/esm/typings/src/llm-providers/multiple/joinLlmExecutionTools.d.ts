import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { MultipleLlmExecutionTools } from './MultipleLlmExecutionTools';
/**
 * Joins multiple LLM Execution Tools into one
 *
 * @returns {LlmExecutionTools} Single wrapper for multiple LlmExecutionTools
 *
 * 0) If there is no LlmExecutionTools, it warns and returns valid but empty LlmExecutionTools
 * 1) If there is only one LlmExecutionTools, it returns it wrapped in a proxy object
 * 2) If there are multiple LlmExecutionTools, first will be used first, second will be used if the first hasn`t defined model variant or fails, etc.
 * 3) When all LlmExecutionTools fail, it throws an error with a list of all errors merged into one
 *
 *
 * Tip: You don't have to use this function directly, just pass an array of LlmExecutionTools to the `ExecutionTools`
 *
 * @public exported from `@promptbook/core`
 */
export declare function joinLlmExecutionTools(...llmExecutionTools: Array<LlmExecutionTools>): MultipleLlmExecutionTools;
/**
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */ 
