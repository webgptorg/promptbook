import { string_semantic_version } from '../../../types/typeAliases';

/**
 * Tests if given string is valid semantic version.
 */
export function isValidSemanticVersion(filePath: unknown): filePath is string_semantic_version {
    if (typeof filePath !== 'string') {
        return false;
    }

    return /^\d+\.\d+\.\d+(-\d+)?$/i.test(filePath);
}
