import type { PipelineJson } from '../PipelineJson/PipelineJson';
import { getPipelineInterface } from './getPipelineInterface';
import { isPipelineInterfacesEqual } from './isPipelineInterfacesEqual';
import type { PipelineInterface } from './PipelineInterface';

/**
 * Options for the `isPipelineImplementingInterface` function.
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type IsPipelineImplementingInterfaceOptions = {
    /**
     * @param pipeline The pipeline to check.
     */
    pipeline: PipelineJson;

    /**
     * @param pipelineInterface The interface to check against.
     */
    pipelineInterface: PipelineInterface;
};

/**
 * Checks if a given pipeline satisfies the requirements of a specified pipeline interface.
 *
 * @deprecated https://github.com/webgptorg/promptbook/pull/186
 * @see https://github.com/webgptorg/promptbook/discussions/171
 * @returns `true` if the pipeline implements the interface, `false` otherwise.
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelineImplementingInterface(options: IsPipelineImplementingInterfaceOptions): boolean {
    const { pipeline, pipelineInterface } = options;

    return isPipelineInterfacesEqual(getPipelineInterface(pipeline), pipelineInterface);
}
