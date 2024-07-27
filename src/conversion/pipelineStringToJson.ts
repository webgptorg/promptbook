import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import { prepareKnowledgeFromMarkdown } from '../knowledge/prepare-knowledge/markdown/prepareKnowledgeFromMarkdown';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../types/PipelineString';
import { pipelineStringToJsonSync } from './pipelineStringToJsonSync';

/**
 * Options for pipelineStringToJson
 */
export type PipelineStringToJsonOptions = {
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
 * @throws {ParsingError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export async function pipelineStringToJson(
    pipelineString: PipelineString,
    options: PipelineStringToJsonOptions = {},
): Promise<PipelineJson> {
    const { llmTools } = options;

    // TODO: !!!!! Do here materialization of still unmaterialized or dynamic knowledge
    // TODO: !!!!! Do here preparePersona
    // TODO:  ----X----- [🧠] !!! Preconvert knowledge and error in pipelineStringToJsonSync if still present
    let pipelineJson = pipelineStringToJsonSync(pipelineString);

    if (llmTools) {
        const knowledge = await prepareKnowledgeFromMarkdown({
            content: 'Roses are red, violets are blue, programmers use Promptbook, users too', // <- TODO: !!!!! Unhardcode
            llmTools,
        });
        pipelineJson = { ...pipelineJson, knowledge: [...(pipelineJson.knowledge || []), ...knowledge] };
    }

    return pipelineJson;
}

/**
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 */
