import spaceTrim from 'spacetrim';
import { ERRORS } from '..';
import { UnexpectedError } from '../UnexpectedError';
import { ErrorJson } from './ErrorJson';

/**
 * Serializes an error into a [🚉] JSON-serializable object
 *
 * @public exported from `@promptbook/utils`
 */

export function serializeError(error: Error): ErrorJson {
    const { name, message, stack } = error;

    if (!['Error', ...Object.keys(ERRORS)].includes(name)) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
          
                    Cannot serialize error with name "${name}"

                    ${block(stack || message)}
                
                `,
            ),
        );
    }

    return {
        name: name as ErrorJson['name'],
        message,
        stack,
    };
}
