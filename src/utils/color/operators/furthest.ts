import { Color } from '../Color';
import type { ColorTransformer } from './ColorTransformer';
import { nearest } from './nearest';
import { negative } from './negative';

/**
 * Makes color transformer which finds the furthest color from the given list
 *
 * @param colors array of colors to choose from
 *
 * @public exported from `@promptbook/color`
 */
export function furthest(...colors: Color[]): ColorTransformer {
    return (color) => {
        const furthestColor = negative(nearest(...colors.map(negative))(color));

        return furthestColor;
    };
}

/**
 * Makes color transformer which finds the best text color (black or white) for the given background color
 *
 * @public exported from `@promptbook/color`
 */
export const textColor = furthest(Color.get('white'), Color.from('black'));
