import type { string_url } from '../../../types/typeAliases';
import { isValidUrl } from './isValidUrl';

/**
 * Tests if given string is valid pipeline URL URL.
 *
 * Note: There are two simmilar functions:
 * - `isValidUrl` which tests any URL
 * - `isValidPipelineUrl` *(this one)* which tests just pipeline URL
 */
export function isValidPipelineUrl(url: unknown): url is string_url {
    if (!isValidUrl(url)) {
        return false;
    }

    if (!url.startsWith('https://')) {
        return false;
    }

    if (!url.endsWith('.ptbk.md')) {
        return false;
    }

    if (url.includes('#')) {
        // TODO: [🐠]
        return false;
    }

    return true;
}

/**
 * TODO: [🐠] Maybe more info why the URL is invalid
 */
