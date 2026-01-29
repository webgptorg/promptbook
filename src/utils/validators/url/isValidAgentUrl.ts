import type { string_agent_url } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';
import { isValidUrl } from './isValidUrl';

/**
 * Tests if given string is valid agent URL
 *
 * Note: There are few similar functions:
 * - `isValidUrl` which tests any URL
 * - `isValidAgentUrl` *(this one)* which tests just agent URL
 * - `isValidPipelineUrl` which tests just pipeline URL
 *
 * @public exported from `@promptbook/utils`
 */
export function isValidAgentUrl(url: really_unknown): url is string_agent_url {
    if (!isValidUrl(url)) {
        return false;
    }

    if (!url.startsWith('https://') && !url.startsWith('http://') /* <- Note: [👣] */) {
        return false;
    }

    if (url.includes('#')) {
        // TODO: [🐠]
        return false;
    }

    /*
    Note: [👣][🧠] Is it secure to allow pipeline URLs on private and unsecured networks?
    if (isUrlOnPrivateNetwork(url)) {
        return false;
    }
    */

    return true;
}

/**
 * TODO: [🐠] Maybe more info why the URL is invalid
 */
