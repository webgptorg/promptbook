import type { string_file_path } from '../../../types/typeAliases';
import type { really_unknown } from '../../organization/really_unknown';
/**
 * Tests if given string is valid URL.
 *
 * Note: This does not check if the file exists only if the path is valid
 * @public exported from `@promptbook/utils`
 */
export declare function isValidFilePath(filePath: really_unknown): filePath is string_file_path;
