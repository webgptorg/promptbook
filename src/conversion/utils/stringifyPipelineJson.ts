import { LOOP_LIMIT, REPLACING_NONCE } from '../../config';
import type { string_json } from '../../types/typeAliases';

/**
 * Stringify the PipelineJson with proper formatting
 *
 * Note: [0] It can be used for more JSON types like whole collection of pipelines, single knowledge piece, etc.
 * Note: In contrast to JSON.stringify, this function ensures that **embedding index** is on single line
 */
export function stringifyPipelineJson<TType>(pipeline: TType): string_json<TType> {
    let pipelineJsonStringified = JSON.stringify(pipeline, null, 4);

    for (let i = 0; i < LOOP_LIMIT; i++) {
        pipelineJsonStringified = pipelineJsonStringified.replace(
            /(-?0\.\d+),[\n\s]+(-?0\.\d+)/gms,
            `$1${REPLACING_NONCE}$2`,
        );
    }

    pipelineJsonStringified = pipelineJsonStringified.split(REPLACING_NONCE).join(', ');

    pipelineJsonStringified += '\n';

    return pipelineJsonStringified as string_json<TType>;
}

/**
 * TODO: [🐝] Not Working propperly @see https://promptbook.studio/samples/mixed-knowledge.ptbk.md
 * TODO: [🧠][0] Maybe rename to `stringifyPipelineJson`, `stringifyIndexedJson`,...
 * TODO: [🧠] Maybe more elegant solution than replacing via regex
 * TODO: [🍙] Make some standart order of json properties
 */
