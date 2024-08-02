import { PipelineJson } from '../../_packages/types.index';
import { LOOP_LIMIT } from '../../config';
import { string_json } from '../../types/typeAliases';

/**
 * Stringify the PipelineJson with proper formatting
 *
 * Note: [0] It can be used for more JSON types like whole collection of pipelines, single knowledge piece, etc.
 * Note: In contrast to JSON.stringify, this function ensures that **embedding index** is on single line
 */

export function stringifyPipelineJson(pipeline: PipelineJson): string_json<PipelineJson> {
    let pipelineJsonStringified = JSON.stringify(pipeline, null, 4);

    for (let i = 0; i < LOOP_LIMIT; i++) {
        pipelineJsonStringified = pipelineJsonStringified.replace(/(-?0\.\d+),[\n\s]+(-?0\.\d+)/, '$1, $2');
    }

    pipelineJsonStringified += '\n';

    return pipelineJsonStringified as string_json<PipelineJson>;
}

/**
 * TODO: [🧠][0] Maybe rename to `stringifyPipelineJson`, `stringifyIndexedJson`,...
 * TODO: [🔼] Export alongside pipelineStringToJson
 * TODO: [🧠] Maybe more elegant solution than replacing regex
 */
