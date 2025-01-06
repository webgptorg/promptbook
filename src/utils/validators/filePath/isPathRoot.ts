import type { string_dirname } from '../../../types/typeAliases';
import type { string_filename } from '../../../types/typeAliases';

/**
 * Determines if the given path is a root path.
 *
 * Note: This does not check if the file exists only if the path is valid
 * @public exported from `@promptbook/utils`
 */
export function isPathRoot(value: string_dirname | string_filename): boolean {
    if (value === '/') {
        return true;
    }

    if (/^[A-Z]:\\$/i.test(value)) {
        return true;
    }

    return false;
}

/**
 * TODO: [🍏] Make for MacOS paths
 */
