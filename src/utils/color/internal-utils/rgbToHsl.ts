import type { number_integer } from '../../../types/typeAliases';
import type { number_percent } from '../../../types/typeAliases';
import type { number_positive } from '../../../types/typeAliases';

/**
 * Converts RGB values to HSL values
 *
 * @param red [0-255]
 * @param green [0-255]
 * @param blue [0-255]
 * @returns [hue, saturation, lightness] [0-1]
 *
 * @private util of `@promptbook/color`
 */
export function rgbToHsl(
    red: number_positive & number_integer,
    green: number_positive & number_integer,
    blue: number_positive & number_integer,
): readonly [number_percent, number_percent, number_percent] {
    red /= 255;
    green /= 255;
    blue /= 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);

    let hue;
    let saturation;
    const lightness = (max + min) / 2;

    if (max === min) {
        // achromatic
        hue = 0;
        saturation = 0;
    } else {
        const d = max - min;
        saturation = lightness > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case red:
                hue = (green - blue) / d + (green < blue ? 6 : 0);
                break;
            case green:
                hue = (blue - red) / d + 2;
                break;
            case blue:
                hue = (red - green) / d + 4;
                break;
            default:
                hue = 0;
        }
        hue /= 6;
    }

    return [hue, saturation, lightness];
}

/**
 * TODO: Properly name all used internal variables
 */
