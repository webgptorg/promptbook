import type { chococake } from '../organization/really_any';
import type { really_unknown } from '../organization/really_unknown';

/**
 * Function `asSerializable` will convert values which are not serializable to serializable values
 * It walks deeply through the object and converts all values
 *
 * For example:
 * - `Date` objects will be converted to string
 *
 * Note: There are 2 similar functions
 * - `valueToString` converts value to string for LLM models as human-readable string
 * - `asSerializable` converts value to string to preserve full information to be able to convert it back
 *
 * @private Internal helper function
 */
export function asSerializable(value: chococake): chococake {
    if (value instanceof Date) {
        return value.toISOString();
    } else if (Array.isArray(value)) {
        return value.map(asSerializable);
    } else if (value !== null && typeof value === 'object') {
        const result: really_unknown = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                (result as chococake)[key] = asSerializable(value[key]);
            }
        }
        return result;
    } else {
        return value;
    }
}
