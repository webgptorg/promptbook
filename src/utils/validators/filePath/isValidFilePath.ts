import type { string_filename } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Tests if given string is valid URL.
 *
 * Note: This does not check if the file exists only if the path is valid
 * @public exported from `@promptbook/utils`
 */
export function isValidFilePath(filename: really_unknown): filename is string_filename {
    if (typeof filename !== 'string') {
        return false;
    }

    const filenameSlashes = filename.split('\\').join('/');

    // Absolute Unix path: /hello.txt
    if (/^(\/)/i.test(filenameSlashes)) {
        return true;
    }

    // Absolute Windows path: /hello.txt
    if (/^([A-Z]{1,2}:\/?)\//i.test(filenameSlashes)) {
        return true;
    }

    // Relative path: ./hello.txt
    if (/^(\.\.?\/)+/i.test(filenameSlashes)) {
        return true;
    }

    return false;
}
