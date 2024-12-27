import type { PipelineJson } from '../PipelineJson/PipelineJson';
import { getPipelineInterface } from './getPipelineInterface';
import { isPipelineInterfacesEqual } from './isPipelineInterfacesEqual';
import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type IsPipelineImplementingInterfaceOptions = {
    /**
     * @@@
     */
    pipeline: PipelineJson;

    /**
     * @@@
     */
    pipelineInterface: PipelineInterface;
};

/**
 * @@@
 *
 * @deprecated https://github.com/webgptorg/promptbook/pull/186
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelineImplementingInterface(options: IsPipelineImplementingInterfaceOptions): boolean {
    const { pipeline, pipelineInterface } = options;

    return isPipelineInterfacesEqual(getPipelineInterface(pipeline), pipelineInterface);
}
