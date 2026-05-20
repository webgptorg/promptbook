import type { string_color } from '../../types/string_person_fullname';

/**
 * Checks if the given value is a valid hex color string
 *
 * @param value - value to check
 * @returns true if the value is a valid hex color string (e.g., `#009edd`, `#fff`, etc.)
 *
 * @private function of Color
 */
export function isHexColorString(value: unknown): value is string_color {
    return (
        typeof value === 'string' &&
        /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
    );
}
