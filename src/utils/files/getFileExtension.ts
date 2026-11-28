import type { string_filename } from '../../types/string_filename';
import type { string_mime_type } from '../../types/string_mime_type';

/**
 * Get the file extension from a file name
 *
 * @private within the repository
 */
export function getFileExtension(value: string_filename): string_mime_type | null {
    const match = value.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
    return match ? match[1]!.toLowerCase() : null;
}
