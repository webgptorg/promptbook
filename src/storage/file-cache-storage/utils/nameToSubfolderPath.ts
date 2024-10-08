import type { string_name } from '../../../types/typeAliases';

/**
 * @@@
 *
 * @private for `FileCacheStorage`
 */
export function nameToSubfolderPath(name: string_name): Array<string> {
    return [name.substr(0, 1).toLowerCase(), name.substr(1, 1).toLowerCase()];
}
