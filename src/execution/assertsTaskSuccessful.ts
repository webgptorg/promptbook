import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { deserializeError } from '../errors/utils/deserializeError';
import type { PipelineExecutorResult } from './PipelineExecutorResult';

/**
 * Asserts that the execution of a Promptbook is successful
 *
 * Note: If there are only warnings, the execution is still successful but the warnings are logged in the console
 *
 * @param executionResult - The partial result of the Promptbook execution
 * @throws {PipelineExecutionError} If the execution is not successful or if multiple errors occurred
 * @private internal helper function of `asPromise` method of `ExecutionTask`
 */
export function assertsTaskSuccessful(
    executionResult: Pick<PipelineExecutorResult, 'isSuccessful' | 'errors' | 'warnings'>,
): void {
    const { isSuccessful, errors, warnings } = executionResult;

    for (const warning of warnings) {
        console.warn(warning.message);
    }

    if (isSuccessful === true) {
        return;
    }
    if (errors.length === 0) {
        throw new PipelineExecutionError(`Promptbook Execution failed because of unknown reason`);
    } else if (errors.length === 1) {
        throw deserializeError(errors[0]!);
    } else {
        throw new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    Multiple errors occurred during Promptbook execution

                    ${block(
                        errors
                            .map(({ name, stack, message }, index) =>
                                spaceTrim(
                                    (block) => `
                                        ${name} ${index + 1}:
                                        ${block(stack || message)}
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
