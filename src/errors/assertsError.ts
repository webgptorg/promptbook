import type { really_unknown } from '../utils/organization/really_unknown';
import { UnexpectedError } from './UnexpectedError';
import { WrappedError } from './WrappedError';

/**
 * Helper used in catch blocks to assert that the error is an instance of `Error`
 *
 * @param whatWasThrown Any object that was thrown
 * @returns Nothing if the error is an instance of `Error`
 * @throws `WrappedError` or `UnexpectedError` if the error is not standard
 *
 * @private within the repository
 */
export function assertsError(whatWasThrown: really_unknown): asserts whatWasThrown is Error {
    // Case 1: Handle error which was rethrown as `WrappedError`
    if (whatWasThrown instanceof WrappedError) {
        const wrappedError = whatWasThrown;
        throw wrappedError;
    }

    // Case 2: Handle unexpected errors
    if (whatWasThrown instanceof UnexpectedError) {
        const unexpectedError = whatWasThrown;
        throw unexpectedError;
    }

    // Case 3: Handle standard errors - keep them up to consumer
    if (whatWasThrown instanceof Error) {
        return;
    }

    // Case 4: Handle non-standard errors - wrap them into `WrappedError` and throw
    throw new WrappedError(whatWasThrown);
}
