import type { string_file_path } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Tests if given string is valid URL.
 *
 * Note: This does not check if the file exists only if the path is valid
 * @public exported from `@promptbook/utils`
 */
export function isValidFilePath(filePath: really_unknown): filePath is string_file_path {
    if (typeof filePath !== 'string') {
        return false;
    }

    const filePathSlashes = filePath.split('\\').join('/');

    // Absolute Unix path: /hello.txt
    if (/^(\/)/i.test(filePathSlashes)) {
        return true;
    }

    // Absolute Windows path: /hello.txt
    if (/^([A-Z]{1,2}:\/?)\//i.test(filePathSlashes)) {
        return true;
    }

    // Relative path: ./hello.txt
    if (/^(\.\.?\/)+/i.test(filePathSlashes)) {
        return true;
    }

    return false;
}
