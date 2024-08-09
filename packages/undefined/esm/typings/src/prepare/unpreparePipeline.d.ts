import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
/**
 * Unprepare just strips the preparation data of the pipeline
 *
 * @public exported from `@promptbook/core`
 */
export declare function unpreparePipeline(pipeline: PipelineJson): PipelineJson;
/**
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 * TODO: Write tests for `preparePipeline`
 * TODO: [🍙] Make some standart order of json properties
 */
