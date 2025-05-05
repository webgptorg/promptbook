import type { PipelineInterface } from './PipelineInterface';

/**
 * Pipeline interface which is equivalent to `any`
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export const GENERIC_PIPELINE_INTERFACE = {
    inputParameters: [],
    outputParameters: [],
} as const satisfies PipelineInterface;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
