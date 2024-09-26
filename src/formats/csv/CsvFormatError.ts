import { AbstractFormatError } from "../../errors/AbstractFormatError";

/**
 * This error indicates problem with parsing of CSV
 *
 * @public exported from `@promptbook/core`
 */
export class CsvFormatError extends AbstractFormatError {
    public readonly name = 'CsvFormatError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CsvFormatError.prototype);
    }
}
