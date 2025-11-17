import type { number_percent } from '../../../types/typeAliases';
import { Color } from '../Color';
import { hslToRgb } from '../internal-utils/hslToRgb';
import { rgbToHsl } from '../internal-utils/rgbToHsl';
import type { ColorTransformer } from './ColorTransformer';

/**
 * Makes color transformer which lighten the given color
 *
 * @param amount from 0 to 1
 *
 * @public exported from `@promptbook/color`
 */
export function lighten(amount: number_percent): ColorTransformer {
    return ({ red, green, blue, alpha }: Color) => {
        const [h, s, lInitial] = rgbToHsl(red, green, blue);
        let l = lInitial + amount;
        l = Math.max(0, Math.min(l, 1)); // Replace lodash clamp with Math.max and Math.min
        const [r, g, b] = hslToRgb(h, s, l);

        return Color.fromValues(r, g, b, alpha);
    };
}

/**
 * TODO: Maybe implement by mix+hsl
 */
