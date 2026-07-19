import { sanitizeBackupPathSegment } from '../backup/sanitizeBackupPathSegment';

/**
 * Extension used for single-agent book downloads.
 */
const BOOK_FILE_EXTENSION = '.book';

/**
 * Fallback book filename base used when an agent name sanitizes to an empty value.
 */
const DEFAULT_BOOK_FILENAME_BASE = 'Agent book';

/**
 * Pattern matching non-ASCII characters that need an ASCII `filename=` fallback.
 */
const NON_ASCII_CONTENT_DISPOSITION_FILENAME_PATTERN = /[^\x20-\x7e]/g;

/**
 * Pattern matching quoted-string characters that can break `Content-Disposition`.
 */
const QUOTED_CONTENT_DISPOSITION_FILENAME_PATTERN = /["\\]/g;

/**
 * Creates a filesystem-safe filename for one downloaded agent book.
 *
 * @param agentName - Human-readable agent name used as the filename base.
 * @returns Safe `.book` download filename.
 */
export function createAgentBookDownloadFilename(agentName: string): string {
    const filenameBase = sanitizeBackupPathSegment(agentName, DEFAULT_BOOK_FILENAME_BASE);

    if (filenameBase.toLowerCase().endsWith(BOOK_FILE_EXTENSION)) {
        return filenameBase;
    }

    return `${filenameBase}${BOOK_FILE_EXTENSION}`;
}

/**
 * Creates a safe `Content-Disposition` value for one downloaded agent book.
 *
 * @param filename - Full download filename, including extension.
 * @returns Header value with an ASCII fallback and RFC 5987 UTF-8 filename.
 */
export function createAgentBookDownloadContentDisposition(filename: string): string {
    const fallbackFilename = filename
        .replace(NON_ASCII_CONTENT_DISPOSITION_FILENAME_PATTERN, '_')
        .replace(QUOTED_CONTENT_DISPOSITION_FILENAME_PATTERN, '_');

    return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
