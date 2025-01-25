import { extension } from 'mime-types';
import type { string_file_extension } from '../../types/typeAliases';
import type { string_mime_type } from '../../types/typeAliases';

/**
 * Convert mime type to file extension
 *
 * Note: If the mime type is invalid, `null` is returned
 *
 * @private within the repository
 */
export function mimeTypeToExtension(value: string_mime_type): string_file_extension | null {
    return extension(value) || null;
}
