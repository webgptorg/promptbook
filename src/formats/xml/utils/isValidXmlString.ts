import { string_xml } from '../XmlFormatDefinition';
import { validateXmlString } from './validateXmlString';

/**
 * Function to check if a string is valid XML.
 *
 * @param value - The string to check.
 * @returns True if the string is a valid XML string, false otherwise.
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidXmlString(value: unknown): value is string_xml {
    try {
        validateXmlString(value);
        return true;
    } catch {
        return false;
    }
}
