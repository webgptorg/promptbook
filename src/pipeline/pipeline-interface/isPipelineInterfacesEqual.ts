import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
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
 * TODO: !!! Write unit test
 */
