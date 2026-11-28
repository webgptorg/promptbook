import { AbstractFormatError } from '../../errors/AbstractFormatError';

/**
 * This error indicates problem with parsing of JSON
 *
 * @public exported from `@promptbook/core`
 */
export class JsonFormatError extends AbstractFormatError {
    public readonly name = 'JsonFormatError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, JsonFormatError.prototype);
    }
}
