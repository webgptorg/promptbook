import { Color } from '../Color';

/**
 * Compares two colors to determine if they are equal based on their RGB values.
 *
 * @param color1 - The first color to compare.
 * @param color2 - The second color to compare.
 * @returns {boolean} True if the colors are equal, false otherwise.
 * 
 * @public exported from `@promptbook/color`
 */
export function areColorsEqual(color1: Color, color2: Color): boolean {
    return color1.red === color2.red && color1.green === color2.green && color1.blue === color2.blue;
}

/**
 * TODO: [🥎] Implement for N colors
 */
