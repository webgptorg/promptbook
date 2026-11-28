import { Color } from '../Color';

/**
 * Calculates luminance of the color
 *
 * @see https://en.wikipedia.org/wiki/Relative_luminance
 *
 * @public exported from `@promptbook/color`
 */
export function colorLuminance(color: Color): number {
    const { r, g, b } = color;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
