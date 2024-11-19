import { PipelineJson } from '@promptbook/types';
import { getPipelineInterface } from './getPipelineInterface';
import { isPipelineInterfacesEqual } from './isPipelineInterfacesEqual';
import { PipelineInterface } from './PipelineInterface';

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
 * TODO: !!! Write unit test
 */
