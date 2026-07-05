import { sanitizeBackupPathSegment } from '../sanitizeBackupPathSegment';
import { normalizeOptionalText } from './serverBackupRowUtilities';

/**
 * JSON file extension used by the per-entity exports.
 *
 * @private constant of `createServerBackupZipStream`
 */
const JSON_FILE_EXTENSION = '.json';

/**
 * Resolves the preferred binary backup filename while keeping the original file extension when available.
 *
 * @param fileName - Stored filename/path.
 * @param fallbackUrl - Public file URL used when the filename is empty.
 * @param fallbackStem - Deterministic fallback stem.
 * @returns Safe filename for the ZIP archive.
 *
 * @private function of `createServerBackupZipStream`
 */
export function resolveBinaryBackupFilename(
    fileName: string | null | undefined,
    fallbackUrl: string | null | undefined,
    fallbackStem: string,
): string {
    const rawBaseName =
        resolvePathBasename(fileName, '') ||
        resolvePathBasename(fallbackUrl, '') ||
        fallbackStem;

    return sanitizeBackupPathSegment(rawBaseName, fallbackStem);
}

/**
 * Creates one human-readable backup filename stem from optional labels.
 *
 * @param labels - Preferred labels ordered by importance.
 * @param fallbackStem - Deterministic fallback stem.
 * @returns Safe filename stem without extension.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createBackupStem(
    labels: ReadonlyArray<string | null | undefined>,
    fallbackStem: string,
): string {
    const normalizedLabels = labels
        .map((label) => normalizeOptionalText(label))
        .filter((label): label is string => Boolean(label));

    return sanitizeBackupPathSegment(
        normalizedLabels.length > 0 ? normalizedLabels.join(' -- ') : fallbackStem,
        fallbackStem,
    );
}

/**
 * Ensures one filename ends with `.json`.
 *
 * @param filenameStem - Filename stem or full filename.
 * @returns JSON filename.
 *
 * @private function of `createServerBackupZipStream`
 */
export function ensureJsonFilename(filenameStem: string): string {
    return filenameStem.endsWith(JSON_FILE_EXTENSION) ? filenameStem : `${filenameStem}${JSON_FILE_EXTENSION}`;
}

/**
 * Creates the metadata sidecar filename for a JSON export file.
 *
 * @param jsonFilename - Main JSON filename.
 * @returns Sidecar metadata filename.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createJsonMetadataFilename(jsonFilename: string): string {
    return jsonFilename.endsWith(JSON_FILE_EXTENSION)
        ? `${jsonFilename.slice(0, -JSON_FILE_EXTENSION.length)}.metadata.json`
        : `${jsonFilename}.metadata.json`;
}

/**
 * Creates the metadata sidecar filename for a binary export file.
 *
 * @param filename - Main binary filename.
 * @returns Sidecar metadata filename.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createBinaryMetadataFilename(filename: string): string {
    return `${filename}.metadata.json`;
}

/**
 * Creates a unique filename inside one ZIP folder with deterministic suffixes.
 *
 * @param usedFilenames - Already allocated filenames in the folder.
 * @param filename - Preferred filename candidate.
 * @param suffixBase - Deterministic suffix base used on collisions.
 * @returns Unique filename for the ZIP folder.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createUniqueBackupFilename(
    usedFilenames: Set<string>,
    filename: string,
    suffixBase: string,
): string {
    if (!usedFilenames.has(filename)) {
        usedFilenames.add(filename);
        return filename;
    }

    const extensionIndex = filename.lastIndexOf('.');
    const hasExtension = extensionIndex > 0;
    const filenameBase = hasExtension ? filename.slice(0, extensionIndex) : filename;
    const extension = hasExtension ? filename.slice(extensionIndex) : '';

    for (let suffixIndex = 0; suffixIndex < Number.MAX_SAFE_INTEGER; suffixIndex += 1) {
        const suffix = suffixIndex === 0 ? `--${suffixBase}` : `--${suffixBase}-${suffixIndex + 1}`;
        const nextFilename = `${filenameBase}${suffix}${extension}`;

        if (!usedFilenames.has(nextFilename)) {
            usedFilenames.add(nextFilename);
            return nextFilename;
        }
    }

    throw new Error(`Unable to allocate unique backup filename for ${suffixBase}.`);
}

/**
 * Resolves the basename from a stored path or URL.
 *
 * @param value - Stored path or URL.
 * @param fallback - Fallback filename when no basename exists.
 * @returns Basename without parent directories or query strings.
 *
 * @private function of `createServerBackupZipStream`
 */
export function resolvePathBasename(value: string | null | undefined, fallback: string): string {
    const normalizedValue = normalizeOptionalText(value);
    if (!normalizedValue) {
        return fallback;
    }

    try {
        const url = new URL(normalizedValue);
        const urlPathSegments = url.pathname.split('/').filter(Boolean);
        const urlBaseName = urlPathSegments[urlPathSegments.length - 1];
        if (urlBaseName) {
            return decodeURIComponent(urlBaseName);
        }
    } catch {
        // Continue with plain path parsing below.
    }

    const pathSegments = normalizedValue.split(/[\\/]/).filter(Boolean);
    return pathSegments[pathSegments.length - 1] || fallback;
}
