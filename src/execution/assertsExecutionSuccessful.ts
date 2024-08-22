import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { deserializeError } from '../errors/utils/deserializeError';
import type { PipelineExecutor } from './PipelineExecutor';

/**
 * Asserts that the execution of a Promptbook is successful
 *
 * @param executionResult - The partial result of the Promptbook execution
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
