import { Color } from '../Color';

/**
 * Calculates distance between two colors
 *
 * @param color1 first color
 * @param color2 second color
 *
 * Note: This function is inefficient. Use colorDistanceSquared instead if possible.
 *
 * @public exported from `@promptbook/color`
 */
export function colorDistance(color1: Color, color2: Color): number {
    const rmean = (color1.red + color2.red) / 2;
    const r = color1.red - color2.red;
    const g = color1.green - color2.green;
    const b = color1.blue - color2.blue;
    const weightR = 2 + rmean / 256;
    const weightG = 4.0;
    const weightB = 2 + (255 - rmean) / 256;
    const distance = Math.sqrt(weightR * r * r + weightG * g * g + weightB * b * b);

    return distance;
}

/**
 * Calculates distance between two colors without square root
 *
 * @param color1 first color
 * @param color2 second color
 *
 * @public exported from `@promptbook/color`
 */
export function colorDistanceSquared(color1: Color, color2: Color): number {
    const rmean = (color1.red + color2.red) / 2;
    const r = color1.red - color2.red;
    const g = color1.green - color2.green;
    const b = color1.blue - color2.blue;
    const weightR = 2 + rmean / 256;
    const weightG = 4.0;
    const weightB = 2 + (255 - rmean) / 256;
    const distance = weightR * r * r + weightG * g * g + weightB * b * b;

    return distance;
}
