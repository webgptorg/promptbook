import type { string_semantic_version } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';

/**
 * Tests if given string is valid semantic version
 *
 * Note: There are two simmilar functions:
 * - `isValidSemanticVersion` which tests any semantic version
 * - `isValidPromptbookVersion` *(this one)* which tests just Promptbook versions
 * 
 * @public exported from `@promptbook/utils`
 */
export function isValidSemanticVersion(version: really_unknown): version is string_semantic_version {
    if (typeof version !== 'string') {
        return false;
    }

    if (version.startsWith('0.0.0')) {
        return false;
    }

    return /^\d+\.\d+\.\d+(-\d+)?$/i.test(version);
}
