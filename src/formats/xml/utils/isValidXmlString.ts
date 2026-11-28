import type { string_xml } from '../../../types/string_markdown';
import { validateXmlString } from './validateXmlString';

/**
 * Function to check if a string is valid XML.
 *
 * @param value - The value to check.
 * @returns True when the value is a valid XML string.
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
