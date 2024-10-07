import type { string_filename } from '../../types/typeAliases';
import type { string_mime_type } from '../../types/typeAliases';

/**
 * Get the file extension from a file name
 *
 * @private within the repository
 */
export function getFileExtension(value: string_filename): string_mime_type | null {
    const match = value.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
    return match ? match[1]!.toLowerCase() : null;
}
