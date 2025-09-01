import { Color } from "../Color";

/**
 * Calculates saturation of the color
 *
 * @see https://en.wikipedia.org/wiki/HSL_and_HSV#Saturation
 * 
 * @public exported from `@promptbook/color`
 */
export function colorSaturation(color: Color): number {
    const { r, g, b } = color;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (max === 0) {
      return 0;
    } else {
      return delta / max;
    }
  }
  