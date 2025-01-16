import spaceTrim from 'spacetrim';
import { ALL_ERRORS } from '../0-index';
import type { ErrorJson } from './ErrorJson';

/**
 * Deserializes the error object
 *
 * @public exported from `@promptbook/utils`
 */
export function deserializeError(error: ErrorJson): Error {
    const { name, stack } = error;
    let { message } = error;
    let ErrorClass = ALL_ERRORS[error.name as keyof typeof ALL_ERRORS];

    if (ErrorClass === undefined) {
        ErrorClass = Error;
        message = `${name}: ${message}`;
    }

    if (stack !== undefined && stack !== '') {
        message = spaceTrim(
            (block) => `
                ${block(message)}

                Original stack trace:
                ${block(stack || '')}
            `,
        );
    }

    return new ErrorClass(message);
}
