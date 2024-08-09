import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
/**
 * Determine if the pipeline is fully prepared
 *
 * @public exported from `@promptbook/core`
 */
export declare function isPipelinePrepared(pipeline: PipelineJson): boolean;
/**
 * TODO: [🐠] Maybe base this on `makeValidator`
 * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 *     - [🏍] ? Is context in each template
 *     - [♨] Are samples prepared
 *     - [♨] Are templates prepared
 */
