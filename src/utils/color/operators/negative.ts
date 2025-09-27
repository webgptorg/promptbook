import { Color } from '../Color';

/**
 * Color transformer which returns the negative color
 *
 * @public exported from `@promptbook/color`
 */
export function negative(color: Color): Color {
    const r = 255 - color.red;
    const g = 255 - color.green;
    const b = 255 - color.blue;
    return Color.fromValues(r, g, b, color.alpha);
}
