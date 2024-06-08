import type { string_url } from '../../../types/typeAliases';

/**
 * Tests if given string is valid URL.
 *
 * Note: Dataurl are considered perfectly valid.
 */
export function isValidUrl(url: unknown): url is string_url {
    if (typeof url !== 'string') {
        return false;
    }
    try {
        if (url.startsWith('blob:')) {
            url = url.replace(/^blob:/, '');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const urlObject = new URL(url as any);

        if (!['http:', 'https:', 'data:'].includes(urlObject.protocol)) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}
