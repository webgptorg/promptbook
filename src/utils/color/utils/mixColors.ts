import type { WithTake } from '../../take/interfaces/ITakeChain';
import { Color } from '../Color';

/**
 * Mixes an array of colors and returns the average color
 *
 * @param {...Color} colors - The array of colors to be mixed.
 * @returns {WithTake<Color>} - The mixed color.
 * 
 * @public exported from `@promptbook/color`
 */
export function mixColors(...colors: Array<Color>): WithTake<Color> {
    const red = colors.reduce((sum, color) => sum + color.red, 0) / colors.length;
    const green = colors.reduce((sum, color) => sum + color.green, 0) / colors.length;
    const blue = colors.reduce((sum, color) => sum + color.blue, 0) / colors.length;
    const alpha = colors.reduce((sum, color) => sum + color.alpha, 0) / colors.length;
    return Color.fromValues(red, green, blue, alpha);
}
