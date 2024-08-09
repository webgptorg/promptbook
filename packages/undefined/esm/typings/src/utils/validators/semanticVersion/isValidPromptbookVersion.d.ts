import type { string_promptbook_version } from '../../../version';
import type { really_unknown } from '../../organization/really_unknown';
/**
 * Tests if given string is valid promptbook version
 * It looks into list of known promptbook versions.
 *
 * @see https://www.npmjs.com/package/promptbook?activeTab=versions
 * Note: When you are using for example promptbook 2.0.0 and there already is promptbook 3.0.0 it don`t know about it.
 * Note: There are two simmilar functions:
 * - `isValidSemanticVersion` which tests any semantic version
 * - `isValidPromptbookVersion` *(this one)* which tests just Promptbook versions
 *
 * @public exported from `@promptbook/utils`
 */
export declare function isValidPromptbookVersion(version: really_unknown): version is string_promptbook_version;
