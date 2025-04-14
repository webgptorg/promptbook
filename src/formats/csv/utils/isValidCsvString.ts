import { assertsError } from '../../../errors/assertsError';

/**
 * Function to check if a string is valid CSV
 *
 * @param value The string to check
 * @returns True if the string is a valid CSV string, false otherwise
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidCsvString(value: string): boolean {
    try {
        // A simple check for CSV format: at least one comma and no invalid characters
        if (value.includes(',') && /^[\w\s,"']+$/.test(value)) {
            return true;
        }
        return false;
    } catch (error) {
        assertsError(error);
        return false;
    }
}
