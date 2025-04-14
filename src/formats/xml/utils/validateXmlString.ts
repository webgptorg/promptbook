import { assertsError } from '../../../errors/assertsError';
import { CsvFormatError } from '../../csv/CsvFormatError';
import { string_xml } from '../XmlFormatDefinition';

/**
 * Function to validate if a string is a valid XML string.
 * Throws an error if the string is not valid XML.
 *
 * @param value - The string to validate.
 * @throws Error if the string is not valid XML.
 *
 * @public exported from `@promptbook/utils`
 */

export function validateXmlString(value: unknown): string_xml {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('Invalid XML: Input is not a valid string.');
    }
    try {
        const parser = new DOMParser();
        const parsedDocument = parser.parseFromString(value, 'application/xml');
        const parserError = parsedDocument.getElementsByTagName('parsererror');

        if (parserError.length > 0) {
            throw new CsvFormatError('Invalid XML: Parsing error detected.');
        }
    } catch (error) {
        assertsError(error);
        throw error;
    }
}
