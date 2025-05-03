import type { string_javascript_name } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Checks if the given value is a valid JavaScript identifier name.
 *
 * @param javascriptName The value to check for JavaScript identifier validity.
 * @returns `true` if the value is a valid JavaScript name, false otherwise.
 * @public exported from `@promptbook/utils`
 */
export function isValidJavascriptName(javascriptName: really_unknown): javascriptName is string_javascript_name {
    if (typeof javascriptName !== 'string') {
        return false;
    }

    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/i.test(javascriptName);
}
