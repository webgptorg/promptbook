import type { FileWithAgent } from './filesGalleryTypes';

/**
 * Minimal file fields required to build a browser link from a gallery row.
 *
 * @private type of `/admin/files`
 */
type FilesGalleryFileLinkCandidate = Pick<FileWithAgent, 'storageUrl' | 'shortUrl'>;

/**
 * Resolves the best available URL for opening a file from the gallery.
 *
 * @param file - File row containing stored public URLs.
 * @returns Public file href, or `null` when no usable URL is available.
 * @private helper of `/admin/files`
 */
export function resolveFilesGalleryFileHref(file: FilesGalleryFileLinkCandidate): string | null {
    return normalizeFilesGalleryFileUrl(file.storageUrl) || normalizeFilesGalleryFileUrl(file.shortUrl);
}

/**
 * Normalizes one optional file URL field.
 *
 * @param url - Raw URL from a file row.
 * @returns Trimmed URL, or `null` when empty.
 * @private helper of `resolveFilesGalleryFileHref`
 */
function normalizeFilesGalleryFileUrl(url: string | null | undefined): string | null {
    const normalizedUrl = url?.trim();
    return normalizedUrl ? normalizedUrl : null;
}
