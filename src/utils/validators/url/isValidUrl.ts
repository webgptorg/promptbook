import type { really_any } from '../../../types/typeAliases';
import type { string_url } from '../../../types/typeAliases';

/**
 * Tests if given string is valid URL.
 *
 * Note: Dataurl are considered perfectly valid.
 * Note: There are two simmilar functions:
 * - `isValidUrl` which tests any URL
 * - `isValidPipelineUrl` *(this one)* which tests just promptbook URL
 */
export function isValidUrl(url: unknown): url is string_url {
    if (typeof url !== 'string') {
        return false;
    }
    try {
        if (url.startsWith('blob:')) {
            url = url.replace(/^blob:/, '');
        }

        const urlObject = new URL(url as really_any /* because fail is handled */);

        if (!['http:', 'https:', 'data:'].includes(urlObject.protocol)) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}
