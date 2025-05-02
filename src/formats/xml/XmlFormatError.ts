import { AbstractFormatError } from '../../errors/AbstractFormatError';

/**
 * This error indicates problem with parsing of XML
 *
 * @public exported from `@promptbook/core`
 */
export class XmlFormatError extends AbstractFormatError {
    public readonly name = 'XmlFormatError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CsvFormatError.prototype);
    }
}
