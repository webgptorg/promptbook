import { Color } from '../Color';
import { colorDistanceSquared } from '../utils/colorDistance';
import type { ColorTransformer } from './ColorTransformer';

/**
 * Makes color transformer which finds the nearest color from the given list
 *
 * @param colors array of colors to choose from
 *
 * @public exported from `@promptbook/color`
 */
export function nearest(...colors: Color[]): ColorTransformer {
    return (color: Color) => {
        const distances = colors.map((currentColor) => colorDistanceSquared(currentColor, color));
        const minDistance = Math.min(...distances);
        const minIndex = distances.indexOf(minDistance);
        const nearestColor = colors[minIndex]!;

        return nearestColor;
    };
}
