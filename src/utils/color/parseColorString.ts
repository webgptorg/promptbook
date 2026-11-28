import type { string_color } from '../../types/string_person_fullname';
import { CSS_COLORS } from './css-colors';
import { isHexColorString } from './isHexColorString';
import type { ColorChannelSet } from './parsers/ColorChannelSet';
import { parseHexColor } from './parsers/parseHexColor';
import { parseHslColor } from './parsers/parseHslColor';
import { parseRgbaColor, parseRgbColor } from './parsers/parseRgbColor';

/**
 * Pattern matching hsl regex.
 *
 * @private function of Color
 */
const HSL_REGEX_PATTERN = /^hsl\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/;

/**
 * Pattern matching RGB regex.
 *
 * @private function of Color
 */
const RGB_REGEX_PATTERN = /^rgb\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/;

/**
 * Pattern matching rgba regex.
 *
 * @private function of Color
 */
const RGBA_REGEX_PATTERN = /^rgba\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/;

/**
 * Parses a supported color string into RGBA channels.
 *
 * @param color as a string for example `#009edd`, `rgb(0,158,221)`, `rgb(0%,62%,86.7%)`, `hsl(197.1,100%,43.3%)`, `red`, `darkgrey`,...
 * @returns RGBA channel values.
 *
 * @private function of Color
 */
export function parseColorString(color: string_color): ColorChannelSet {
    const trimmed = color.trim();
    const cssColor = CSS_COLORS[trimmed as keyof typeof CSS_COLORS];

    if (cssColor) {
        return parseColorString(cssColor);
    } else if (isHexColorString(trimmed)) {
        return parseHexColor(trimmed);
    }

    if (HSL_REGEX_PATTERN.test(trimmed)) {
        return parseHslColor(trimmed as string_color);
    } else if (RGB_REGEX_PATTERN.test(trimmed)) {
        return parseRgbColor(trimmed as string_color);
    } else if (RGBA_REGEX_PATTERN.test(trimmed)) {
        return parseRgbaColor(trimmed as string_color);
    } else {
        throw new Error(`Can not create a new Color instance from string "${trimmed}".`);
    }
}
