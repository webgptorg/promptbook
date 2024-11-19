import { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const GENERIC_PIPELINE_INTERFACE = {
    inputParameterNames: [],
    outputParameterNames: [],
} as const satisfies PipelineInterface;
