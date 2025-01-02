import { VALUE_STRINGS } from '../../config';
import { string_parameter_value } from '../../types/typeAliases';
import { really_unknown } from '../organization/really_unknown';
import { numberToString } from './numberToString';

/**
 * Function `valueToString` will convert the given value to string
 * This is useful and used in the `templateParameters` function
 *
 * Note: This function is not just calling `toString` method
 *       It's more complex and can handle this conversion specifically for LLM models
 *       See `VALUE_STRINGS`
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
        } else if (typeof value === 'number') {
            return numberToString(value);
        } else {
            return JSON.stringify(value);
        }
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        console.error(error);
        return VALUE_STRINGS.unserializable;
    }
}
