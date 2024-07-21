import { string_semantic_version } from '../../../types/typeAliases';
import { isValidSemanticVersion } from './isValidSemanticVersion';

/**
 * Tests if given string is valid semantic version.
 */
export function isValidPromptbookVersion(filePath: unknown): filePath is string_semantic_version {
    if (!isValidSemanticVersion(filePath)) {
        return false;
    }

    return true;
    // <- TODO: !!!! Check isValidPromptbookVersion against PROMPTBOOK_VERSIONS
}
