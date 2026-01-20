import { VALUE_STRINGS } from '../../config';
import { assertsError } from '../../errors/assertsError';
import type { string_parameter_value } from '../../types/typeAliases';
import type { really_unknown } from '../organization/really_unknown';
import { numberToString } from './numberToString';

/**
 * Function `valueToString` will convert the given value to string
 * This is useful and used in the `templateParameters` function
 *
 * Note: This function is not just calling `toString` method
 *       It's more complex and can handle this conversion specifically for LLM models
 *       See `VALUE_STRINGS`
 *
 * Note: There are 2 similar functions
 * - `valueToString` converts value to string for LLM models as human-readable string
 * - `asSerializable` converts value to string to preserve full information to be able to convert it back
 *
 * @public exported from `@promptbook/utils`
 */
export function valueToString(value: really_unknown): string_parameter_value {
    try {
        if (value === '') {
            return VALUE_STRINGS.empty;
        } else if (value === null) {
            return VALUE_STRINGS.null;
        } else if (value === undefined) {
            return VALUE_STRINGS.undefined;
        } else if (typeof value === 'string') {
            return value;
        } else if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        } else if (typeof value === 'number') {
            return numberToString(value);
        } else if (value instanceof Date) {
            return value.toISOString();
        } else if (Array.isArray(value)) {
            // Handle arrays specially for better LLM readability
            try {
                // For simple arrays, create a readable list
                if (value.length === 0) {
                    return '(empty array)';
                }
                if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
                    return value.map((item) => valueToString(item)).join(', ');
                }
                // For complex arrays, use JSON
                return JSON.stringify(value);
            } catch (error) {
                if (error instanceof TypeError && error.message.includes('circular structure')) {
                    return VALUE_STRINGS.circular;
                }
                throw error;
            }
        } else if (typeof value === 'object') {
            // Handle plain objects
            try {
                return JSON.stringify(value);
            } catch (error) {
                if (error instanceof TypeError && error.message.includes('circular structure')) {
                    return VALUE_STRINGS.circular;
                }
                throw error;
            }
        } else {
            // Handle other types (functions, symbols, etc.)
            return String(value);
        }
    } catch (error) {
        assertsError(error);

        console.error(error);
        return VALUE_STRINGS.unserializable;
    }
}
