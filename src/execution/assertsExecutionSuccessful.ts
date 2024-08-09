import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import type { PipelineExecutor } from './PipelineExecutor';

/**
 * Asserts that the execution of a promptnook is successful
 *
 * @param executionResult - The partial result of the promptnook execution
 * @throws {PipelineExecutionError} If the execution is not successful or if multiple errors occurred
 * @public exported from `@promptbook/core`
 */
export function assertsExecutionSuccessful(
    executionResult: Pick<Awaited<ReturnType<PipelineExecutor>>, 'isSuccessful' | 'errors'>,
): void {
    const { isSuccessful, errors } = executionResult;

    if (isSuccessful === true) {
        return;
    }
    if (errors.length === 0) {
        throw new PipelineExecutionError(`Promptnook Execution failed because of unknown reason`);
    } else if (errors.length === 1) {
        throw errors[0];
    } else {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    Multiple errors occurred during promptnook execution

                    ${block(
                        errors
                            .map((error, index) =>
                                spaceTrim(
                                    (block) => `
                                        Error ${index + 1}:
                                        ${block(error.stack || error.message)}
                                    `,
                                ),
                            )
                            .join('\n'),
                    )}
                `,
            ),
        );
    }
}

/**
 * TODO: [🧠] Can this return type be better typed than void
 */
