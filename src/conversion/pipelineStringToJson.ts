import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../types/PipelineString';
import { pipelineStringToJsonSync } from './pipelineStringToJsonSync';
import { preparePipeline } from './preparePipeline';

/**
 * Options for pipelineStringToJson
 */
export type PipelineStringToJsonOptions = {
    /**
     * Tools for processing required for preparation of knowledge *(not for actual execution)*
     *
     * Note: If you provide `null`, the knowledge will not be prepared
     */
    llmTools: LlmExecutionTools | null;
};

/**
 * Compile pipeline from string (markdown) format to JSON format
 *
 * Note: There are 3 similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @param options - Options and tools for the compilation
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParsingError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export async function pipelineStringToJson(
    pipelineString: PipelineString,
    options: PipelineStringToJsonOptions = { llmTools: null },
): Promise<PipelineJson> {
    const { llmTools } = options;

    let pipelineJson = pipelineStringToJsonSync(pipelineString);

    if (llmTools !== null) {
        pipelineJson = await preparePipeline(pipelineJson, { llmTools });
    }

    return pipelineJson;
}

/**
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 */
