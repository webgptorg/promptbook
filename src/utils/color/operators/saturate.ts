import type { number_percent } from '../../../types/typeAliases';
import { Color } from '../Color';
import { hslToRgb } from '../internal-utils/hslToRgb';
import { rgbToHsl } from '../internal-utils/rgbToHsl';
import type { ColorTransformer } from './ColorTransformer';

/**
 * Makes color transformer which saturate the given color
 *
 * @param amount from -1 to 1
 *
 * @public exported from `@promptbook/color`
 */

export function saturate(amount: number_percent): ColorTransformer {
    return ({ red, green, blue, alpha }: Color) => {
        const [h, sInitial, l] = rgbToHsl(red, green, blue);
        let s = sInitial + amount;
        s = Math.max(0, Math.min(s, 1));
        const [r, g, b] = hslToRgb(h, s, l);

        return Color.fromValues(r, g, b, alpha);
    };
}

/**
 * TODO: Maybe implement by mix+hsl
 */
