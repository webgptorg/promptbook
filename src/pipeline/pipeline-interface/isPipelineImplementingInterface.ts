import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import { getPipelineInterface } from './getPipelineInterface';
import { isPipelineInterfacesEqual } from './isPipelineInterfacesEqual';
import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
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
 * @public exported from `@promptbook/core`
 */
export function isPipelineImplementingInterface(options: IsPipelineImplementingInterfaceOptions): boolean {
    const { pipeline, pipelineInterface } = options;

    return isPipelineInterfacesEqual(getPipelineInterface(pipeline), pipelineInterface);
}
/**
 * TODO: !!!!!! Test real implementing NOT equality
 * TODO: !!!!!! Write unit test
 */
