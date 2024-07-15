import { spaceTrim } from 'spacetrim';
import { ExecutionError } from '../errors/ExecutionError';
import type { PipelineExecutor } from './PipelineExecutor';

/**
 * Asserts that the execution of a promptnook is successful
 *
 * @param executionResult - The partial result of the promptnook execution
 * @throws {ExecutionError} If the execution is not successful or if multiple errors occurred
 */
export function assertsExecutionSuccessful(
    executionResult: Pick<Awaited<ReturnType<PipelineExecutor>>, 'isSuccessful' | 'errors'>,
): void {
    const { isSuccessful, errors } = executionResult;

    if (isSuccessful === true) {
        return;
    }
    if (errors.length === 0) {
        throw new ExecutionError(`Promptnook Execution failed because of unknown reason`);
    } else if (errors.length === 1) {
        throw errors[0];
    } else {
        throw new ExecutionError(
            spaceTrim(
                (block) => `
                    Multiple errors occurred during promptnook execution

                    ${block(errors.map((error) => '- ' + error.message).join('\n'))}
                `,
            ),
        );
    }
}

/**
 * TODO: [🧠] Can this return type be better typed than void
 */
