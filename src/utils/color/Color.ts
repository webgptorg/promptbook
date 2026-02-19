import type { string_color, string_url_image } from '../../types/typeAliases';
import { spaceTrim } from '../organization/spaceTrim';
import { TODO_USE } from '../organization/TODO_USE';
import type { WithTake } from '../take/interfaces/ITakeChain';
import { take } from '../take/take';
import { CSS_COLORS } from './css-colors';
import { checkChannelValue } from './internal-utils/checkChannelValue';
import { parseHexColor } from './parsers/parseHexColor';
import { parseHslColor } from './parsers/parseHslColor';
import { parseRgbColor, parseRgbaColor } from './parsers/parseRgbColor';

const HSL_REGEX_PATTERN = /^hsl\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/;
const RGB_REGEX_PATTERN = /^rgb\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/;
const RGBA_REGEX_PATTERN = /^rgba\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/;

/**
 * Color object represents an RGB color with alpha channel
 *
 * Note: There is no fromObject/toObject because the most logical way to serialize color is as a hex string (#009edd)
 *
 * @public exported from `@promptbook/color`
 */
export class Color {
    /**
     * Creates a new Color instance from miscellaneous formats
     * - It can receive Color instance and just return the same instance
     * - It can receive color in string format for example `#009edd`, `rgb(0,158,221)`, `rgb(0%,62%,86.7%)`, `hsl(197.1,100%,43.3%)`
     *
     * Note: This is not including fromImage because detecting color from an image is heavy task which requires async stuff and we cannot safely determine with overloading if return value will be a promise
     *
     * @param color
     * @returns Color object
     */
    public static from(color: string_color | Color, _isSingleValue: boolean = false): WithTake<Color> {
        if (color === '') {
            throw new Error(`Can not create color from empty string`);
        } else if (color instanceof Color) {
            return take(color);
        } else if (Color.isColor(color)) {
            return take(color);
        } else if (typeof color === 'string') {
            try {
                return Color.fromString(color);
            } catch (error) {
                // <- Note: Can not use `assertsError(error)` here because it causes circular dependency
                if (_isSingleValue) {
                    throw error;
                }

                const parts = color.split(/[\s+,;|]/);
                if (parts.length > 0) {
                    return Color.from(parts[0]!.trim(), true);
                } else {
                    throw new Error(`Can not create color from given string "${color}"`);
                }
            }
        } else {
            console.error({ color });
            throw new Error(`Can not create color from given object`);
        }
    }

    /**
     * Creates a new Color instance from miscellaneous formats
     * It just does not throw error when it fails, it returns PROMPTBOOK_COLOR instead
     *
     * @param color
     * @returns Color object
     */
    public static fromSafe(color: string_color | Color): WithTake<Color> {
        try {
            return Color.from(color);
        } catch (error) {
            // <- Note: Can not use `assertsError(error)` here because it causes circular dependency

            console.warn(
                spaceTrim(
                    (block) => `
                        Color.fromSafe error:
                        ${block((error as Error).message)}

                        Returning default PROMPTBOOK_COLOR.
                    `,
                ),
            );

            return Color.fromString('promptbook');
        }
    }

    /**
     * Creates a new Color instance from miscellaneous string formats
     *
     * @param color as a string for example `#009edd`, `rgb(0,158,221)`, `rgb(0%,62%,86.7%)`, `hsl(197.1,100%,43.3%)`, `red`, `darkgrey`,...
     * @returns Color object
     */
    public static fromString(color: string_color): WithTake<Color> {
        const trimmed = color.trim();

        if (CSS_COLORS[trimmed as keyof typeof CSS_COLORS]) {
            return Color.fromString(CSS_COLORS[trimmed as keyof typeof CSS_COLORS]);
        } else if (Color.isHexColorString(trimmed)) {
            return Color.fromHex(trimmed);
        }

        if (HSL_REGEX_PATTERN.test(trimmed)) {
            return Color.fromHsl(trimmed as string_color);
        } else if (RGB_REGEX_PATTERN.test(trimmed)) {
            return Color.fromRgbString(trimmed as string_color);
        } else if (RGBA_REGEX_PATTERN.test(trimmed)) {
            return Color.fromRgbaString(trimmed as string_color);
        } else {
            throw new Error(`Can not create a new Color instance from string "${trimmed}".`);
        }
    }

    /**
     * Gets common color
     *
     * @param key as a css string like `midnightblue`
     * @returns Color object
     */
    public static get(key: keyof typeof CSS_COLORS): WithTake<Color> {
        if (!CSS_COLORS[key]) {
            throw new Error(`"${key}" is not a common css color.`);
        }

        return Color.fromString(CSS_COLORS[key]);
    }

    /**
     * Creates a new Color instance from average color of given image
     *
     * @param image as a source for example `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYJh39z8ABJgCe/ZvAS4AAAAASUVORK5CYII=`
     * @returns Color object
     */
    public static async fromImage(image: string_url_image): Promise<Color> {
        // TODO: Implement + Add samples here
        TODO_USE(image);
        return Color.fromHex(`#009edd`);
    }

    /**
     * Creates a new Color instance from color in hex format
     *
     * @param color in hex for example `#009edd`, `009edd`, `#555`,...
     * @returns Color object
     */
    public static fromHex(hex: string_color): WithTake<Color> {
        const { red, green, blue, alpha } = parseHexColor(hex);
        return take(new Color(red, green, blue, alpha));
    }

    /**
     * Creates a new Color instance from color in hsl format
     *
     * @param color as a hsl for example `hsl(197.1,100%,43.3%)`
     * @returns Color object
     */
    public static fromHsl(hsl: string_color): WithTake<Color> {
        const { red, green, blue, alpha } = parseHslColor(hsl);
        return take(new Color(red, green, blue, alpha));
    }

    /**
     * Creates a new Color instance from color in rgb format
     *
     * @param color as a rgb for example `rgb(0,158,221)`, `rgb(0%,62%,86.7%)`
     * @returns Color object
     */
    public static fromRgbString(rgb: string_color): WithTake<Color> {
        const { red, green, blue, alpha } = parseRgbColor(rgb);
        return take(new Color(red, green, blue, alpha));
    }

    /**
     * Creates a new Color instance from color in rbga format
     *
     * @param color as a rgba for example `rgba(0,158,221,0.5)`, `rgb(0%,62%,86.7%,50%)`
     * @returns Color object
     */
    public static fromRgbaString(rgba: string_color): WithTake<Color> {
        const { red, green, blue, alpha } = parseRgbaColor(rgba);
        return take(new Color(red, green, blue, alpha));
    }

    /**
     * Creates a new Color for color channels values
     *
     * @param red number from 0 to 255
     * @param green number from 0 to 255
     * @param blue number from 0 to 255
     * @param alpha number from 0 (transparent) to 255 (opaque = default)
     * @returns Color object
     */
    public static fromValues(red: number, green: number, blue: number, alpha: number = 255): WithTake<Color> {
        return take(new Color(red, green, blue, alpha));
    }

    /**
     * Checks if the given value is a valid Color object.
     *
     * @param {unknown} value - The value to check.
     * @return {value is WithTake<Color>} Returns true if the value is a valid Color object, false otherwise.
     */
    public static isColor(value: unknown): value is WithTake<Color> {
        if (typeof value !== 'object') {
            return false;
        }

        if (value === null) {
            return false;
        }

        if (
            typeof (value as Color).red !== 'number' ||
            typeof (value as Color).green !== 'number' ||
            typeof (value as Color).blue !== 'number' ||
            typeof (value as Color).alpha !== 'number'
        ) {
            return false;
        }

        if (typeof (value as WithTake<Color>).then !== 'function') {
            return false;
        }

        return true;
    }

    /**
     * Checks if the given value is a valid hex color string
     *
     * @param value - value to check
     * @returns true if the value is a valid hex color string (e.g., `#009edd`, `#fff`, etc.)
     */
    public static isHexColorString(value: unknown): value is string_color {
        return (
            typeof value === 'string' &&
            /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
        );
    }

    /**
     * Creates new Color object
     *
     * Note: Consider using one of static methods like `from` or `fromString`
     *
     * @param red number from 0 to 255
     * @param green number from 0 to 255
     * @param blue number from 0 to 255
     * @param alpha number from 0 (transparent) to 255 (opaque)
     */
    private constructor(
        public readonly red: number,
        public readonly green: number,
        public readonly blue: number,
        public readonly alpha: number = 255,
    ) {
        checkChannelValue('Red', red);
        checkChannelValue('Green', green);
        checkChannelValue('Blue', blue);
        checkChannelValue('Alpha', alpha);
    }

    /**
     * Shortcut for `red` property
     * Number from 0 to 255
     * @alias red
     */
    public get r(): number {
        return this.red;
    }

    /**
     * Shortcut for `green` property
     * Number from 0 to 255
     * @alias green
     */
    public get g(): number {
        return this.green;
    }

    /**
     * Shortcut for `blue` property
     * Number from 0 to 255
     * @alias blue
     */
    public get b(): number {
        return this.blue;
    }

    /**
     * Shortcut for `alpha` property
     * Number from 0 (transparent) to 255 (opaque)
     * @alias alpha
     */
    public get a(): number {
        return this.alpha;
    }

    /**
     * Shortcut for `alpha` property
     * Number from 0 (transparent) to 255 (opaque)
     * @alias alpha
     */
    public get opacity(): number {
        return this.alpha;
    }

    /**
     * Shortcut for 1-`alpha` property
     */
    public get transparency(): number {
        return 255 - this.alpha;
    }

    public clone(): WithTake<Color> {
        return take(new Color(this.red, this.green, this.blue, this.alpha));
    }

    public toString(): string_color {
        return this.toHex();
    }

    public toHex(): string_color {
        if (this.alpha === 255) {
            return `#${this.red.toString(16).padStart(2, '0')}${this.green
                .toString(16)
                .padStart(2, '0')}${this.blue.toString(16).padStart(2, '0')}`;
        } else {
            return `#${this.red.toString(16).padStart(2, '0')}${this.green
                .toString(16)
                .padStart(2, '0')}${this.blue.toString(16).padStart(2, '0')}${this.alpha
                .toString(16)
                .padStart(2, '0')}`;
        }
    }

    public toRgb(): string_color {
        if (this.alpha === 255) {
            return `rgb(${this.red}, ${this.green}, ${this.blue})`;
        } else {
            return `rgba(${this.red}, ${this.green}, ${this.blue}, ${Math.round((this.alpha / 255) * 100)}%)`;
        }
    }

    public toHsl(): string_color {
        throw new Error(`Getting HSL is not implemented`);
    }
}
