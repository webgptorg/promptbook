import type { number_integer, number_percent, number_positive } from '../../../types/typeAliases';

/**
 * Converts HSL values to RGB values
 *
 * @param hue [0-1]
 * @param saturation [0-1]
 * @param lightness [0-1]
 * @returns [red, green, blue] [0-255]
 *
 * @private util of `@promptbook/color`
 */
export function hslToRgb(
    hue: number_percent,
    saturation: number_percent,
    lightness: number_percent,
): readonly [number_positive & number_integer, number_positive & number_integer, number_positive & number_integer] {
    let red;
    let green;
    let blue;

    if (saturation === 0) {
        // achromatic
        red = lightness;
        green = lightness;
        blue = lightness;
    } else {
        // TODO: Extract to separate function
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
        const p = 2 * lightness - q;
        red = hue2rgb(p, q, hue + 1 / 3);
        green = hue2rgb(p, q, hue);
        blue = hue2rgb(p, q, hue - 1 / 3);
    }

    return [Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255)];
}

/**
 * TODO: Properly name all used internal variables
 */
