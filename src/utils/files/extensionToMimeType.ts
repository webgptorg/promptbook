import { lookup } from 'mime-types';
import type { string_mime_type } from '../../types/string_mime_type';
import type { string_file_extension } from '../../types/string_sha256';

/**
 * Convert file extension to mime type
 *
 * @private within the repository
 */
export function extensionToMimeType(value: string_file_extension): string_mime_type {
    return lookup(value) || 'application/octet-stream';
}
