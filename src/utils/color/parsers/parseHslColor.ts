import type { string_color } from '../../../types/typeAliases';
import type { ColorChannelSet } from './ColorChannelSet';

const HSL_REGEX = /^hsl\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/;

/**
 * Parses an HSL string into RGBA channel values.
 *
 * @param hsl - HSL string such as `hsl(197.1, 100%, 43.3%)`.
 * @returns RGBA channel values.
 *
 * @private function of Color
 */
export function parseHslColor(hsl: string_color): ColorChannelSet {
    const match = hsl.match(HSL_REGEX);
    if (!match) {
        throw new Error(`Invalid hsl string format: "${hsl}"`);
    }

    const hue = parseFloat(match[1]!);
    const saturation = parseFloat(match[2]!) / 100;
    const lightness = parseFloat(match[3]!) / 100;

    const { red, green, blue } = convertHslToRgb(hue, saturation, lightness);

    return {
        red,
        green,
        blue,
        alpha: 255,
    };
}

function convertHslToRgb(h: number, s: number, l: number) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (h >= 0 && h < 60) {
        r1 = c;
        g1 = x;
    } else if (h >= 60 && h < 120) {
        r1 = x;
        g1 = c;
    } else if (h >= 120 && h < 180) {
        g1 = c;
        b1 = x;
    } else if (h >= 180 && h < 240) {
        g1 = x;
        b1 = c;
    } else if (h >= 240 && h < 300) {
        r1 = x;
        b1 = c;
    } else if (h >= 300 && h < 360) {
        r1 = c;
        b1 = x;
    }

    return {
        red: Math.round((r1 + m) * 255),
        green: Math.round((g1 + m) * 255),
        blue: Math.round((b1 + m) * 255),
    };
}
