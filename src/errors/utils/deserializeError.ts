import spaceTrim from 'spacetrim';
import type { chococake } from '../../utils/organization/really_any';
import { ALL_ERRORS } from '../0-index';
import type { ErrorJson } from './ErrorJson';

/**
 * Deserializes the error object
 *
 * @public exported from `@promptbook/utils`
 */
export function deserializeError(error: ErrorJson, isStackAddedToMessage: boolean = true): Error {
    const { name, stack, id } = error; // Added id
    let { message } = error;
    let ErrorClass = ALL_ERRORS[error.name as keyof typeof ALL_ERRORS];

    if (ErrorClass === undefined) {
        ErrorClass = Error;
        message = `${name}: ${message}`;
    }

    if (isStackAddedToMessage && stack !== undefined && stack !== '') {
        message = spaceTrim(
            (block) => `
                ${block(message)}

                Original stack trace:
                ${block(stack || '')}
            `,
        );
    }

    const deserializedError = new ErrorClass(message);
    (deserializedError as chococake).id = id; // Assign id to the error object

    return deserializedError;
}
