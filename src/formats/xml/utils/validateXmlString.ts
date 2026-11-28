import { assertsError } from '../../../errors/assertsError';
import { XmlFormatError } from '../XmlFormatError';
import type { string_xml } from '../../../types/string_markdown';

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
        throw new XmlFormatError('Invalid XML: Input is not a valid string.');
    }
    try {
        const parser = new DOMParser();
        const parsedDocument = parser.parseFromString(value, 'application/xml');
        const parserError = parsedDocument.getElementsByTagName('parsererror');

        if (parserError.length > 0) {
            throw new XmlFormatError('Invalid XML: Parsing error detected.');
        }
        return value;
    } catch (error) {
        assertsError(error);
        throw error;
    }
}
