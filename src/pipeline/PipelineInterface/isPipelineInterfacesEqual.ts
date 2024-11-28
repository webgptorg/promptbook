import type { PipelineInterface } from './PipelineInterface';

/**
 * @@@
 * 
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelineInterfacesEqual(
    pipelineInterface1: PipelineInterface,
    pipelineInterface2: PipelineInterface,
    // <- TODO: ...pipelineInterfaces: Array<PipelineInterface>
): boolean {
    // TODO: [🧠] !!! Implement better
    // TODO: [🧠] !!! Probbably do not check the description
    //       + @see https://github.com/webgptorg/promptbook/discussions/53
    //       + @see https://github.com/webgptorg/book/blob/main/pips/pip-0002.md
    return JSON.stringify(pipelineInterface1) === JSON.stringify(pipelineInterface2);

}

/**
 * TODO: [🧠] !!! Return more states than true/false - 'IDENTICAL' |'IDENTICAL_UNPREPARED' | 'IDENTICAL_INTERFACE' | 'DIFFERENT'
 * TODO: !!! Write unit test
 */
