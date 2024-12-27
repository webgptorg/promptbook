import { ALL_ERRORS } from '../0-index';
import type { ErrorJson } from './ErrorJson';

/**
 * Deserializes the error object
 *
 * @public exported from `@promptbook/utils`
 */

export function deserializeError(error: ErrorJson): Error {
    const ErrorClass = ALL_ERRORS[error.name as keyof typeof ALL_ERRORS];

    if (ErrorClass === undefined) {
        return new Error(`${error.name}: ${error.message}`);
    }

    return new ErrorClass(error.message);
}
