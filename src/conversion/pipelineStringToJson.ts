import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import { preparePipeline } from '../prepare/preparePipeline';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../types/PipelineString';
import { pipelineStringToJsonSync } from './pipelineStringToJsonSync';

/**
 * Compile pipeline from string (markdown) format to JSON format
 *
 * Note: There are 3 similar functions:
 * - `pipelineStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `pipelineStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * Note: This function does not validate logic of the pipeline only the parsing
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.ptbk.md)
 * @param options - Options and tools for the compilation
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {ParseError} if the promptbook string is not valid
 * @public exported from `@promptbook/core`
 */
export async function pipelineStringToJson(
    pipelineString: PipelineString,
    options?: PrepareAndScrapeOptions,
): Promise<PipelineJson> {
    const { llmTools } = options || {};

    let pipelineJson = pipelineStringToJsonSync(pipelineString);

    if (llmTools !== undefined) {
        pipelineJson = await preparePipeline(
            pipelineJson,
            options || {
                rootDirname: null,
            },
        );
    }

    // Note: No need to use `$asDeeplyFrozenSerializableJson` because `pipelineStringToJsonSync` and `preparePipeline` already do that
    return pipelineJson;
}

/**
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠] Should be in generated JSON file GENERATOR_WARNING
 */
