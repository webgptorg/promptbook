import type { string_url } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';
/**
 * Tests if given string is valid URL.
 *
 * Note: Dataurl are considered perfectly valid.
 * Note: There are two simmilar functions:
 * - `isValidUrl` which tests any URL
 * - `isValidPipelineUrl` *(this one)* which tests just promptbook URL
 *
 * @public exported from `@promptbook/utils`
 */
export declare function isValidUrl(url: really_unknown): url is string_url;
