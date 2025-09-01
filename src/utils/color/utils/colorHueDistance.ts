import { Color } from '../Color';
import { colorHue } from './colorHue';

/**
 * Calculates hue distance of two colors
 *
 * @returns hue distance in degrees <0-180)
 *
 * @see https://en.wikipedia.org/wiki/HSL_and_HSV#Hue_and_chroma
 *
 * @public exported from `@promptbook/color`
 */
export function colorHueDistance(color1: Color, color2: Color): number {
    const hue1 = colorHue(color1);
    const hue2 = colorHue(color2);
    const delta = Math.abs(hue1 - hue2);
    const distance = delta > 180 ? 360 - delta : delta;

    return distance;
}
