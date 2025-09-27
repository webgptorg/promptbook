import { Color } from '../Color';

/**
 * Calculates hue of the color
 *
 * @returns hue in degrees <0-360)
 *
 * @see https://en.wikipedia.org/wiki/HSL_and_HSV#Hue_and_chroma
 *
 * @public exported from `@promptbook/color`
 */
export function colorHue(color: Color): number {
    const { r, g, b } = color;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta !== 0) {
        if (max === r) {
            hue = ((g - b) / delta) % 6;
        } else if (max === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }
        hue *= 60;
        if (hue < 0) {
            hue += 360;
        }
    }
    return hue;
}
