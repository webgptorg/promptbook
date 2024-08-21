import { ERRORS } from '../index';
import type { ErrorJson } from './ErrorJson';

/**
 * Deserializes the error object
 *
 * @public exported from `@promptbook/utils`
 */

export function deserializeError(error: ErrorJson): Error {
    if (error.name === 'Error') {
        return new Error(error.message);
    }

    const CustomError = ERRORS[error.name as keyof typeof ERRORS];

    return new CustomError(error.message);
}
