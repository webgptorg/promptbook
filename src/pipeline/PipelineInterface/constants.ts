import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 * 
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export const GENERIC_PIPELINE_INTERFACE = {
    inputParameterNames: [],
    outputParameterNames: [],
} as const satisfies PipelineInterface;
