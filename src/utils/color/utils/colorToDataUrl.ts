import { string_color, string_data_url, string_url_image } from '../../../types/typeAliases';
import { Color } from '../Color';

/**
 * Makes data url from color
 *
 * @public exported from `@promptbook/color`
 */
export function colorToDataUrl(color: Color | string_color): string_data_url & string_url_image {
    if (typeof color === 'string') {
        color = Color.fromHex(color);
    }

    return rgbDataURL(color.red, color.green, color.blue);
}

/**
 * Pixel GIF code adapted from https://stackoverflow.com/a/33919020/266535
 *
 * @private util of `colorToDataUrl`
 */
const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Generates a base64-encoded triplet string
 *
 * @param e1 - The first element in the triplet.
 * @param e2 - The second element in the triplet.
 * @param e3 - The third element in the triplet.
 * @returns The base64-encoded triplet string.
 *
 * @private util of `colorToDataUrl`
 */
const triplet = (e1: number, e2: number, e3: number) =>
    keyStr.charAt(e1 >> 2) +
    keyStr.charAt(((e1 & 3) << 4) | (e2 >> 4)) +
    keyStr.charAt(((e2 & 15) << 2) | (e3 >> 6)) +
    keyStr.charAt(e3 & 63);

/**
 * Converts RGB values to a data URL string
 *
 * @param r - The red channel value.
 * @param g - The green channel value.
 * @param b - The blue channel value.
 * @returns The RGB data URL string.
 *
 * @private util of `colorToDataUrl`
 */
const rgbDataURL = (r: number, g: number, b: number): string_data_url & string_url_image =>
    `data:image/gif;base64,R0lGODlhAQABAPAA${
        triplet(0, r, g) + triplet(b, 255, 255)
    }/yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==`;

/**
 * TODO: Make as functions NOT const
 */
