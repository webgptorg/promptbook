import type { PipelineExecutor } from './PipelineExecutor';
/**
 * Asserts that the execution of a promptnook is successful
 *
 * @param executionResult - The partial result of the promptnook execution
 * @throws {PipelineExecutionError} If the execution is not successful or if multiple errors occurred
 * @public exported from `@promptbook/core`
 */
export declare function assertsExecutionSuccessful(executionResult: Pick<Awaited<ReturnType<PipelineExecutor>>, 'isSuccessful' | 'errors'>): void;
/**
 * TODO: [🧠] Can this return type be better typed than void
 */
