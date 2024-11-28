import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 * 
 * @deprecated https://github.com/webgptorg/promptbook/pull/186
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelineInterfacesEqual(
    pipelineInterface1: PipelineInterface,
    pipelineInterface2: PipelineInterface,
): boolean {
    return JSON.stringify(Object.keys(pipelineInterface1)) === JSON.stringify(Object.keys(pipelineInterface2));
}

