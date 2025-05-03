import { assertsError } from '../../../errors/assertsError';

/**
 * Function to check if a string is valid XML
 *
 * @param value
 * @returns `true` if the string is a valid XML string, false otherwise
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidXmlString(value: string): boolean {
    try {
        const parser = new DOMParser();
        const parsedDocument = parser.parseFromString(value, 'application/xml');
        const parserError = parsedDocument.getElementsByTagName('parsererror');

        if (parserError.length > 0) {
            return false;
        }
        return true;
    } catch (error) {
        assertsError(error);
        return false;
    }
}
