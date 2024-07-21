import { string_uuid } from '../../../types/typeAliases';

export function isValidJavascriptName(value: unknown): value is string_uuid {
    if (typeof value !== 'string') {
        return false;
    }

    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/i.test(value);
}
