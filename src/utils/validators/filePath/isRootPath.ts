import type { string_dirname, string_filename } from '../../../types/string_filename';

/**
 * Determines if the given path is a root path.
 *
 * Note: This does not check if the file exists only if the path is valid
 *
 * @public exported from `@promptbook/utils`
 */
export function isRootPath(value: string_dirname | string_filename): boolean {
    if (value === '/') {
        return true;
    }

    if (/^[A-Z]:\\$/i.test(value)) {
        return true;
    }

    return false;
}

// TODO: [🍏] Make for MacOS paths
