import type { string_pipeline_url } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';
/**
 * Tests if given string is valid pipeline URL URL.
 *
 * Note: There are two simmilar functions:
 * - `isValidUrl` which tests any URL
 * - `isValidPipelineUrl` *(this one)* which tests just pipeline URL
 *
 * @public exported from `@promptbook/utils`
 */
export declare function isValidPipelineUrl(url: really_unknown): url is string_pipeline_url;
/**
 * TODO: [🐠] Maybe more info why the URL is invalid
 */
