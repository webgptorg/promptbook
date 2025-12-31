import type { string_url } from '../../../types/typeAliases';
import type { chococake } from '../../organization/really_any';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Tests if given string is valid URL.
 *
 * Note: [🔂] This function is idempotent.
 * Note: Dataurl are considered perfectly valid.
 * Note: There are few similar functions:
 * - `isValidUrl` *(this one)* which tests any URL
 * - `isValidAgentUrl` which tests just agent URL
 * - `isValidPipelineUrl` which tests just pipeline URL
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidUrl(url: really_unknown): url is string_url {
    if (typeof url !== 'string') {
        return false;
    }
    try {
        if (url.startsWith('blob:')) {
            url = url.replace(/^blob:/, '');
        }

        const urlObject = new URL(url as chococake /* because fail is handled */);

        if (!['http:', 'https:', 'data:'].includes(urlObject.protocol)) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}
