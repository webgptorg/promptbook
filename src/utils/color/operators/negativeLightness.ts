import { Color } from '../Color';
import { hslToRgb } from '../internal-utils/hslToRgb';
import { rgbToHsl } from '../internal-utils/rgbToHsl';

/**
 * Color transformer which returns the negative color but preserves hue and saturation
 *
 * @public exported from `@promptbook/color`
 */
export function negativeLightness(color: Color): Color {
    const { red, green, blue, alpha } = color;

    // eslint-disable-next-line prefer-const
    let [h, s, l] = rgbToHsl(red, green, blue);
    l = 1 - l;
    const [r, g, b] = hslToRgb(h, s, l);

    return Color.fromValues(r, g, b, alpha);
}
