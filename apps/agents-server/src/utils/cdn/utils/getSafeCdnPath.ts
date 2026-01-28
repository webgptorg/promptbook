import { computeHash } from '@promptbook-local/utils';

const DEFAULT_MAX_PATHNAME_LENGTH = 950;

/**
 * Parameters for building a CDN path that stays within provider length limits.
 */
export type SafeCdnPathParams = {
    pathname: string;
    pathPrefix?: string;
    maxPathLength?: number;
};

/**
 * Ensures a CDN path fits within the provider's pathname length limit by hashing the filename when needed.
 */
export function getSafeCdnPath({ pathname, pathPrefix, maxPathLength = DEFAULT_MAX_PATHNAME_LENGTH }: SafeCdnPathParams): string {
    const maxLength = Math.max(maxPathLength - getPathPrefixLength(pathPrefix), 1);

    if (pathname.length <= maxLength) {
        return pathname;
    }

    const { directory, filename } = splitPathname(pathname);
    const extension = getFilenameExtension(filename);
    const hash = computeHash(pathname);
    const maxFilenameLength = Math.max(maxLength - (directory ? `${directory}/`.length : 0), 1);

    const safeFilename = buildHashedFilename(hash, extension, maxFilenameLength);
    const candidatePath = directory ? `${directory}/${safeFilename}` : safeFilename;

    if (candidatePath.length <= maxLength) {
        return candidatePath;
    }

    // Fallback when the directory itself consumes most of the available length.
    return buildHashedFilename(hash, extension, maxLength);
}

/**
 * Computes the length of the CDN path prefix segment (including the trailing slash).
 */
function getPathPrefixLength(pathPrefix?: string): number {
    return pathPrefix ? `${pathPrefix}/`.length : 0;
}

/**
 * Splits a pathname into directory and filename segments.
 */
function splitPathname(pathname: string): { directory: string; filename: string } {
    const normalizedPath = pathname.replace(/\/+$/, '');
    const segments = normalizedPath.split('/');
    const filename = segments.pop() || '';
    const directory = segments.join('/');

    return { directory, filename };
}

/**
 * Extracts the file extension (including the dot) from a filename when present.
 */
function getFilenameExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex <= 0 || lastDotIndex === filename.length - 1) {
        return '';
    }

    return filename.slice(lastDotIndex);
}

/**
 * Builds a hash-based filename that fits within the requested maximum length.
 */
function buildHashedFilename(hash: string, extension: string, maxLength: number): string {
    const safeMaxLength = Math.max(maxLength, 1);

    if (!extension || extension.length >= safeMaxLength) {
        return hash.slice(0, safeMaxLength);
    }

    const hashLength = Math.min(hash.length, safeMaxLength - extension.length);
    if (hashLength <= 0) {
        return hash.slice(0, safeMaxLength);
    }

    return `${hash.slice(0, hashLength)}${extension}`;
}
