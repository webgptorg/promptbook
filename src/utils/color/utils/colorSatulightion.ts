import { Color } from '../Color';
import { colorLuminance } from './colorLuminance';
import { colorSaturation } from './colorSaturation';

/**
 * Calculates saturation*luminance of the color
 *
 * @public exported from `@promptbook/color`
 */
export function colorSatulightion(color: Color): number {
    // TODO: !! There is some flaw in rgbToHsl because [1] not work but [2] works - light vs luminance?
    //[1]> const [hue, saturation, light] = rgbToHsl(color.red, color.green, color.blue);
    //[1]> return saturation * light;

    //[2]:
    return colorSaturation(color) * colorLuminance(color);
}
