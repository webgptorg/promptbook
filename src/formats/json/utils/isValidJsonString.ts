import { assertsError } from '../../../errors/assertsError';

/**
 * Function isValidJsonString will tell you if the string is valid JSON or not
 *
 * @param value The string to check
 * @returns `true` if the string is a valid JSON string, false otherwise
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidJsonString(value: string /* <- [👨‍⚖️] */): boolean {
    try {
        JSON.parse(value);
        return true;
    } catch (error) {
        assertsError(error);

        if (error.message.includes('Unexpected token')) {
            return false;
        }

        return false;
    }
}
