import type { string_json } from '../../types/typeAliases';
/**
 * Stringify the PipelineJson with proper formatting
 *
 * Note: [0] It can be used for more JSON types like whole collection of pipelines, single knowledge piece, etc.
 * Note: In contrast to JSON.stringify, this function ensures that **embedding index** is on single line
 *
 * @public exported from `@promptbook/core`
 */
export declare function stringifyPipelineJson<TType>(pipeline: TType): string_json<TType>;
/**
 * TODO: [🐝] Not Working propperly @see https://promptbook.studio/samples/mixed-knowledge.ptbk.md
 * TODO: [🧠][0] Maybe rename to `stringifyPipelineJson`, `stringifyIndexedJson`,...
 * TODO: [🧠] Maybe more elegant solution than replacing via regex
 * TODO: [🍙] Make some standart order of json properties
 */
