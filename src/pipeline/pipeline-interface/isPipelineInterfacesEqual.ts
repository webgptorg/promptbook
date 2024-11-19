import { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 *
 * @param pipelines @@@
 */
export function isPipelineInterfacesEqual(
    pipelineInterface1: PipelineInterface,
    pipelineInterface2: PipelineInterface,
    // <- TODO: ...pipelineInterfaces: Array<PipelineInterface>
): boolean {
    // TODO: [🧠] !!! Implement better
    return JSON.stringify(pipelineInterface1) === JSON.stringify(pipelineInterface2);
}

/**
 * TODO: [🧠] !!! Return more states than true/false - 'IDENTICAL' |'IDENTICAL_UNPREPARED' | 'IDENTICAL_INTERFACE' | 'DIFFERENT'
 * TODO: [🔼] !!! Transfer to promptbook
 * TODO: !!! Write unit test
 */