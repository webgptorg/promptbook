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

    if (filename.split('\n').length > 1) {
        return false;
    }

    // Reject strings that look like sentences (informational text)
    // Heuristic: contains multiple spaces and ends with a period, or contains typical sentence punctuation
    if (
        filename.trim().length > 60 && // long enough to be a sentence
        /[.!?]/.test(filename) && // contains sentence punctuation
        filename.split(' ').length > 8 // has many words
    ) {
        return false;
    }

    const filenameSlashes = filename.replace(/\\/g, '/');

    // Absolute Unix path: /hello.txt
    if (/^(\/)/i.test(filenameSlashes)) {
        // console.log(filename, 'Absolute Unix path: /hello.txt');
        return true;
    }

    // Absolute Windows path: C:/ or C:\ (allow spaces in filename)
    if (/^[A-Z]:\/.+/i.test(filenameSlashes)) {
        // console.log(filename, 'Absolute Windows path: /hello.txt');
        return true;
    }

    // Relative path: ./hello.txt
    if (/^(\.\.?\/)+/i.test(filenameSlashes)) {
        // console.log(filename, 'Relative path: ./hello.txt');
        return true;
    }

    // Allow paths like foo/hello
    if (/^[^/]+\/[^/]+/i.test(filenameSlashes)) {
        // console.log(filename, 'Allow paths like foo/hello');
        return true;
    }

    // Allow paths like hello.book
    if (/^[^/]+\.[^/]+$/i.test(filenameSlashes)) {
        // console.log(filename, 'Allow paths like hello.book');
        return true;
    }

    return false;
}

/**
 * TODO: [🍏] Implement for MacOs
 */
