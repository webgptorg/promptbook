import type { number_percent } from '../../../types/typeAliases';
import { Color } from '../Color';
import type { ColorTransformer } from './ColorTransformer';

/**
 * Makes color transformer which returns a mix of two colors based on a ratio
 *
 * @param ratio the ratio of the first color to the second color, from 0 to 1
 * @param additionalColor the second color to mix with the first color
 *
 * @public exported from `@promptbook/color`
 */
export function mixWithColor(ratio: number_percent, additionalColor: Color): ColorTransformer {
    return (baseColor: Color) => {
        const r = Math.round(baseColor.red * (1 - ratio) + additionalColor.red * ratio);
        const g = Math.round(baseColor.green * (1 - ratio) + additionalColor.green * ratio);
        const b = Math.round(baseColor.blue * (1 - ratio) + additionalColor.blue * ratio);
        const a = baseColor.alpha;
        return Color.fromValues(r, g, b, a);
    };
}
