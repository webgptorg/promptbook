import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../types/PipelineString';
/**
 * Options for `pipelineStringToJson`
 *
 * @public exported from `@promptbook/core`
 */
export type PipelineStringToJsonOptions = {
    /**
     * Tools for processing required for preparation of knowledge *(not for actual execution)*
     *
     * Note: If you provide `null`, the knowledge will not be prepared
     */
    readonly llmTools: LlmExecutionTools | null;
};
/**
 * Compile pipeline from string (markdown) format to JSON format
 *
 * Note: There are 3 similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @param options - Options and tools for the compilation
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParsingError} if the promptbook string is not valid
 * @public exported from `@promptbook/core`
 */
export declare function pipelineStringToJson(pipelineString: PipelineString, options?: PipelineStringToJsonOptions): Promise<PipelineJson>;
/**
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
