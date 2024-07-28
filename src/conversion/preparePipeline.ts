import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';

/**
 * Options for `preparePipeline`
 */
export type PreparePipelineOptions = {
    /**
     * Tools for processing required for knowledge processing *(not for actual execution)*
     */
    readonly  llmTools?: LlmExecutionTools;
};

/**
 * Prepare pipeline from string (markdown) format to JSON format
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 */
export async function preparePipeline(
    pipeline: PipelineJson,
    options: PreparePipelineOptions = {},
): Promise<PipelineJson> {
    const { llmTools } = options;
    const {

        promptbookVersion,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
    } = pipeline;


    if(promptbookVersion!===VERS)

    return {
      ...pipeline
    };
}

/**
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 */
