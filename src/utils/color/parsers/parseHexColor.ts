import type { string_color } from '../../../types/typeAliases';
import type { ColorChannelSet } from './ColorChannelSet';

const SHORT_HEX_LENGTHS = new Set([3, 4]);
const LONG_HEX_LENGTHS = new Set([6, 8]);

/**
 * Parses a hex string into RGBA channel values.
 *
 * @param hex - Hex value such as `#09d`, `009edd`, `#009eddff`.
 * @returns RGBA channel values.
 *
 * @private function of Color
 */
export function parseHexColor(hex: string_color): ColorChannelSet {
    const sanitized = hex.startsWith('#') ? hex.substring(1) : hex;
    const throwInvalidHex = (): never => {
        throw new Error(`Can not parse color from hex string "${hex}"`);
    };

    if (SHORT_HEX_LENGTHS.has(sanitized.length)) {
        return {
            red: parseShortHexChannel(sanitized.charAt(0), throwInvalidHex),
            green: parseShortHexChannel(sanitized.charAt(1), throwInvalidHex),
            blue: parseShortHexChannel(sanitized.charAt(2), throwInvalidHex),
            alpha: sanitized.length === 4 ? parseShortHexChannel(sanitized.charAt(3), throwInvalidHex) : 255,
        };
    }

    if (LONG_HEX_LENGTHS.has(sanitized.length)) {
        return {
            red: parseLongHexChannel(sanitized, 0, throwInvalidHex),
            green: parseLongHexChannel(sanitized, 2, throwInvalidHex),
            blue: parseLongHexChannel(sanitized, 4, throwInvalidHex),
            alpha: sanitized.length === 8 ? parseLongHexChannel(sanitized, 6, throwInvalidHex) : 255,
        };
    }

    return throwInvalidHex();
}

function parseShortHexChannel(char: string, onError: () => never): number {
    if (!char) {
        return onError();
    }

    const parsed = parseInt(char, 16);
    if (Number.isNaN(parsed)) {
        return onError();
    }

    return parsed * 16;
}

function parseLongHexChannel(hex: string, start: number, onError: () => never): number {
    const segment = hex.substr(start, 2);

    if (segment.length < 2) {
        return onError();
    }

    const parsed = parseInt(segment, 16);
    if (Number.isNaN(parsed)) {
        return onError();
    }

    return parsed;
}
