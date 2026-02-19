import type { string_color } from '../../../types/typeAliases';
import type { ColorChannelSet } from './ColorChannelSet';

const RGB_REGEX = /^rgb\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/;
const RGBA_REGEX = /^rgba\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/;

/**
 * Parses an RGB string into RGBA channel values.
 *
 * @param rgb - RGB string such as `rgb(0%, 62%, 86.7%)`.
 * @returns RGBA channel values.
 *
 * @private function of Color
 */
export function parseRgbColor(rgb: string_color): ColorChannelSet {
    const match = rgb.match(RGB_REGEX);
    if (!match) {
        throw new Error(`Invalid rgb string format: "${rgb}"`);
    }

    return {
        red: parseChannelValue(match[1]!),
        green: parseChannelValue(match[2]!),
        blue: parseChannelValue(match[3]!),
        alpha: 255,
    };
}

/**
 * Parses an RGBA string into RGBA channel values.
 *
 * @param rgba - RGBA string such as `rgba(0, 158, 221, 0.5)`.
 * @returns RGBA channel values.
 *
 * @private function of Color
 */
export function parseRgbaColor(rgba: string_color): ColorChannelSet {
    const match = rgba.match(RGBA_REGEX);
    if (!match) {
        throw new Error(`Invalid rgba string format: "${rgba}"`);
    }

    return {
        red: parseChannelValue(match[1]!),
        green: parseChannelValue(match[2]!),
        blue: parseChannelValue(match[3]!),
        alpha: parseAlphaValue(match[4]!),
    };
}

function parseChannelValue(value: string): number {
    if (value.endsWith('%')) {
        const percent = parseFloat(value);
        return Math.round((percent / 100) * 255);
    }

    return Math.round(parseFloat(value));
}

function parseAlphaValue(value: string): number {
    if (value.endsWith('%')) {
        const percent = parseFloat(value);
        return Math.round((percent / 100) * 255);
    }

    const parsed = parseFloat(value);
    if (parsed <= 1) {
        return Math.round(parsed * 255);
    }

    return Math.round(parsed);
}
