import type { string_pipeline_url } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';
import { isUrlOnPrivateNetwork } from './isUrlOnPrivateNetwork';
import { isValidUrl } from './isValidUrl';

/**
 * Tests if given string is valid pipeline URL URL.
 *
 * Note: There are two simmilar functions:
 * - `isValidUrl` which tests any URL
 * - `isValidPipelineUrl` *(this one)* which tests just pipeline URL
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidPipelineUrl(url: really_unknown): url is string_pipeline_url {
    if (!isValidUrl(url)) {
        return false;
    }

    if (!url.startsWith('https://')) {
        return false;
    }

    if (!(url.endsWith('.book.md') || url.endsWith('.book') || url.endsWith('.book.md') || url.endsWith('.ptbk'))) {
        return false;
    }

    if (url.includes('#')) {
        // TODO: [🐠]
        return false;
    }

    if (isUrlOnPrivateNetwork(url)) {
        return false;
    }

    return true;
}

/**
 * TODO: [🐠] Maybe more info why the URL is invalid
 */
