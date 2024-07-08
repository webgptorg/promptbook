import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import { prepareKnowledgeFromMarkdown } from '../knowledge/prepare-knowledge/markdown/prepareKnowledgeFromMarkdown';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../types/PipelineString';
import { just } from '../utils/just';
import { pipelineStringToJsonSync } from './pipelineStringToJsonSync';

/**
 * Options for pipelineStringToJson
 */
type PipelineStringToJsonOptions = {
    /**
     * Tools for processing required for knowledge processing *(not for actual execution)*
     */
    llmTools?: LlmExecutionTools;
};

/**
 * Compile promptbook from string (markdown) format to JSON format
 *
 * Note: There are two similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @param options - Options and tools for the compilation
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {SyntaxError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export async function pipelineStringToJson(
    pipelineString: PipelineString,
    options: PipelineStringToJsonOptions = {},
): Promise<PipelineJson> {
    const { llmTools } = options;

    // TODO: !!!! Use tools here to compile knowledge
    just(llmTools);

    if (llmTools) {
        const knowledge = await prepareKnowledgeFromMarkdown({
            content: 'Roses are red, violets are blue, programmers use Promptbook, users too',
            llmTools,
        });
        console.info('!!!! knowledge', knowledge);
    }

    // TODO: !!! Preconvert knowledge and error in pipelineStringToJsonSync if still present
    const pipelineJson = pipelineStringToJsonSync(pipelineString);

    return pipelineJson;
}

/**
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 */
