import { normalizeToKebabCase } from '../../../../../src/utils/normalization/normalize-to-kebab-case';
import { removeEmojis } from '../../../../../src/utils/normalization/removeEmojis';

/**
 * Split filename result used for upload normalization.
 */
type UploadFilenameParts = {
    baseName: string;
    extension: string | null;
};

/**
 * Normalizes an upload filename to a safe kebab-case representation while preserving extensions.
 *
 * @param filename - The original filename from the user.
 * @returns The normalized filename safe for upload paths.
 */
export function normalizeUploadFilename(filename: string): string {
    const { baseName, extension } = splitFilename(filename);
    const normalizedBaseName = normalizeFilenamePart(baseName);
    const safeBaseName = normalizedBaseName || normalizeFilenamePart('file');

    if (!extension) {
        return safeBaseName;
    }

    const normalizedExtension = normalizeFilenameExtension(extension);

    if (!normalizedExtension) {
        return safeBaseName;
    }

    return `${safeBaseName}.${normalizedExtension}`;
}

/**
 * Splits a filename into base name and extension (without the dot).
 *
 * @param filename - The filename to split.
 * @returns The base name and extension.
 */
function splitFilename(filename: string): UploadFilenameParts {
    const normalizedPath = filename.trim().replace(/\\/g, '/');
    const nameOnly = normalizedPath.split('/').pop() || '';
    const lastDotIndex = nameOnly.lastIndexOf('.');

    if (lastDotIndex <= 0 || lastDotIndex === nameOnly.length - 1) {
        return { baseName: nameOnly, extension: null };
    }

    return {
        baseName: nameOnly.slice(0, lastDotIndex),
        extension: nameOnly.slice(lastDotIndex + 1),
    };
}

/**
 * Normalizes a filename segment to kebab-case without emojis.
 *
 * @param value - The filename segment to normalize.
 * @returns The normalized filename segment.
 */
function normalizeFilenamePart(value: string): string {
    return normalizeToKebabCase(removeEmojis(value));
}

/**
 * Normalizes the file extension to a compact, lowercase string.
 *
 * @param extension - The extension to normalize.
 * @returns The normalized extension.
 */
function normalizeFilenameExtension(extension: string): string {
    return normalizeToKebabCase(removeEmojis(extension)).replace(/-/g, '');
}
