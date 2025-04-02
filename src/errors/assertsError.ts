import { really_unknown } from '../utils/organization/really_unknown';
import { UnexpectedError } from './UnexpectedError';
import { WrappedError } from './WrappedError';

/**
 * !!!@@@
 *
 * @param whatWasThrown !!!@@@
 * @returns !!!@@@
 *
 * @private within the repository
 */
export function assertsError(whatWasThrown: really_unknown): asserts whatWasThrown is Error {
    // Case 1: !!!@@@
    if (whatWasThrown instanceof WrappedError) {
        const wrappedError = whatWasThrown;
        throw wrappedError;
    }

    // Case 2: !!!@@@
    if (whatWasThrown instanceof UnexpectedError) {
        const unexpectedError = whatWasThrown;
        throw unexpectedError;
    }

    // Case 3: !!!@@@
    if (whatWasThrown instanceof Error) {
        return;
    }

    // Case 4: !!!@@@
    throw new WrappedError(whatWasThrown);
}
