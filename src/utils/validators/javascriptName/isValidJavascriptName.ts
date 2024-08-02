import type { string_javascript_name } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';

export function isValidJavascriptName(javascriptName: really_unknown): javascriptName is string_javascript_name {
    if (typeof javascriptName !== 'string') {
        return false;
    }

    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/i.test(javascriptName);
}
