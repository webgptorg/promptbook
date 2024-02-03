import spaceTrim from 'spacetrim';
import type { PtpExecutor } from './PtpExecutor';

/**
 * Asserts that the execution of a promptnook is successful
 *
 * @param executionResult - The partial result of the promptnook execution
 * @throws Error - If the execution is not successful or if multiple errors occurred
 */
export function assertsExecutionSuccessful(
    executionResult: Pick<Awaited<ReturnType<PtpExecutor>>, 'isSuccessful' | 'errors'>,
): void {
    const { isSuccessful, errors } = executionResult;

    if (isSuccessful === true) {
        return;
    }
    if (errors.length === 0) {
        throw new Error(`Promptnook Execution failed because of unknown reason`);
    } else if (errors.length === 1) {
        throw errors[0];
    } else {
        throw new Error(
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
