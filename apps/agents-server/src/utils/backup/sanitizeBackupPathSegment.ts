/**
 * Pattern matching path separators and Windows-reserved punctuation.
 */
const UNSAFE_PATH_SEGMENT_PATTERN = /[<>:"/\\|?*]/g;

/**
 * Pattern matching trailing dots/spaces which are problematic on Windows filesystems.
 */
const TRAILING_DOTS_AND_SPACES_PATTERN = /[.\s]+$/g;

/**
 * Normalizes one folder/file name segment so it is safe inside backup ZIP paths.
 *
 * @param value - Raw folder or file display name from the database.
 * @param fallback - Deterministic fallback when sanitized value would be empty.
 * @returns Filesystem-safe segment that still resembles the original display name.
 */
export function sanitizeBackupPathSegment(value: string, fallback: string): string {
    const withoutControlCharacters = Array.from(value)
        .filter((character) => {
            const codePoint = character.codePointAt(0) || 0;
            return codePoint >= 0x20;
        })
        .join('');

    const normalized = withoutControlCharacters
        .normalize('NFC')
        .replace(UNSAFE_PATH_SEGMENT_PATTERN, '_')
        .replace(/\s+/g, ' ')
        .replace(TRAILING_DOTS_AND_SPACES_PATTERN, '')
        .trim();

    if (!normalized || normalized === '.' || normalized === '..') {
        return fallback;
    }

    return normalized;
}
