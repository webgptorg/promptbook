import type { number_percent } from '../../../types/typeAliases';
import { Color } from '../Color';
import type { ColorTransformer } from './ColorTransformer';

/**
 * Makes color transformer which returns a grayscale version of the color
 *
 * @param amount from 0 to 1
 *
 * @public exported from `@promptbook/color`
 */
export function grayscale(amount: number_percent): ColorTransformer {
    return ({ red, green, blue, alpha }: Color) => {
        const average = (red + green + blue) / 3;
        red = Math.round(average * amount + red * (1 - amount));
        green = Math.round(average * amount + green * (1 - amount));
        blue = Math.round(average * amount + blue * (1 - amount));

        return Color.fromValues(red, green, blue, alpha);
    };
}
