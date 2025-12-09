import type { string_color, string_url_image } from '../../types/typeAliases';
import { spaceTrim } from '../organization/spaceTrim';
import { TODO_USE } from '../organization/TODO_USE';
import type { WithTake } from '../take/interfaces/ITakeChain';
import { take } from '../take/take';
import { CSS_COLORS } from './css-colors';
import { checkChannelValue } from './internal-utils/checkChannelValue';

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
        if (CSS_COLORS[color as keyof typeof CSS_COLORS]) {
            return Color.fromString(CSS_COLORS[color as keyof typeof CSS_COLORS]);

            // -----
        } else if (Color.isHexColorString(color)) {
            return Color.fromHex(color);

            // -----
        } else if (/^hsl\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?%)\s*,\s*(\d+(?:\.\d+)?%)\)$/.test(color)) {
            return Color.fromHsl(color);

            // -----
        } else if (/^rgb\((\s*[0-9-.%]+\s*,?){3}\)$/.test(color)) {
            // TODO: [0] Should be fromRgbString and fromRgbaString one or two functions
            return Color.fromRgbString(color);

            // -----
        } else if (/^rgba\((\s*[0-9-.%]+\s*,?){4}\)$/.test(color)) {
            return Color.fromRgbaString(color);

            // -----
        } else {
            throw new Error(`Can not create a new Color instance from string "${color}".`);
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
        const hexOriginal = hex;

        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        }

        if (hex.length === 3) {
            return Color.fromHex3(hex);
        }

        if (hex.length === 4) {
            return Color.fromHex4(hex);
        }

        if (hex.length === 6) {
            return Color.fromHex6(hex);
        }

        if (hex.length === 8) {
            return Color.fromHex8(hex);
        }

        throw new Error(`Can not parse color from hex string "${hexOriginal}"`);
    }

    /**
     * Creates a new Color instance from color in hex format with 3 color digits (without alpha channel)
     *
     * @param color in hex for example `09d`
     * @returns Color object
     */
    private static fromHex3(hex: string_color): WithTake<Color> {
        const r = parseInt(hex.substr(0, 1), 16) * 16;
        const g = parseInt(hex.substr(1, 1), 16) * 16;
        const b = parseInt(hex.substr(2, 1), 16) * 16;
        return take(new Color(r, g, b));
    }

    /**
     * Creates a new Color instance from color in hex format with 4 digits (with alpha channel)
     *
     * @param color in hex for example `09df`
     * @returns Color object
     */
    private static fromHex4(hex: string_color): WithTake<Color> {
        const r = parseInt(hex.substr(0, 1), 16) * 16;
        const g = parseInt(hex.substr(1, 1), 16) * 16;
        const b = parseInt(hex.substr(2, 1), 16) * 16;
        const a = parseInt(hex.substr(3, 1), 16) * 16;
        return take(new Color(r, g, b, a));
    }

    /**
     * Creates a new Color instance from color in hex format with 6 color digits (without alpha channel)
     *
     * @param color in hex for example `009edd`
     * @returns Color object
     */
    private static fromHex6(hex: string_color): WithTake<Color> {
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return take(new Color(r, g, b));
    }

    /**
     * Creates a new Color instance from color in hex format with 8 color digits (with alpha channel)
     *
     * @param color in hex for example `009edd`
     * @returns Color object
     */
    private static fromHex8(hex: string_color): WithTake<Color> {
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const a = parseInt(hex.substr(6, 2), 16);
        return take(new Color(r, g, b, a));
    }

    /**
     * Creates a new Color instance from color in hsl format
     *
     * @param color as a hsl for example `hsl(197.1,100%,43.3%)`
     * @returns Color object
     */
    public static fromHsl(hsl: string_color): WithTake<Color> {
        const match = hsl.match(/^hsl\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/);
        if (!match) {
            throw new Error(`Invalid hsl string format: "${hsl}"`);
        }

        const h = parseFloat(match[1]!);
        const s = parseFloat(match[2]!) / 100;
        const l = parseFloat(match[3]!) / 100;

        // HSL to RGB conversion
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let r1 = 0,
            g1 = 0,
            b1 = 0;
        if (h >= 0 && h < 60) {
            r1 = c;
            g1 = x;
            b1 = 0;
        } else if (h >= 60 && h < 120) {
            r1 = x;
            g1 = c;
            b1 = 0;
        } else if (h >= 120 && h < 180) {
            r1 = 0;
            g1 = c;
            b1 = x;
        } else if (h >= 180 && h < 240) {
            r1 = 0;
            g1 = x;
            b1 = c;
        } else if (h >= 240 && h < 300) {
            r1 = x;
            g1 = 0;
            b1 = c;
        } else if (h >= 300 && h < 360) {
            r1 = c;
            g1 = 0;
            b1 = x;
        }

        const r = Math.round((r1 + m) * 255);
        const g = Math.round((g1 + m) * 255);
        const b = Math.round((b1 + m) * 255);

        return take(new Color(r, g, b));
    }

    /**
     * Creates a new Color instance from color in rgb format
     *
     * @param color as a rgb for example `rgb(0,158,221)`, `rgb(0%,62%,86.7%)`
     * @returns Color object
     */
    public static fromRgbString(rgb: string_color): WithTake<Color> {
        const match = rgb.match(/^rgb\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/);
        if (!match) {
            throw new Error(`Invalid rgb string format: "${rgb}"`);
        }

        const parseChannel = (value: string): number => {
            if (value.endsWith('%')) {
                // Percentage value
                const percent = parseFloat(value);
                return Math.round((percent / 100) * 255);
            } else {
                // Numeric value
                return Math.round(parseFloat(value));
            }
        };

        const r = parseChannel(match[1]!);
        const g = parseChannel(match[2]!);
        const b = parseChannel(match[3]!);

        return take(new Color(r, g, b));
    }

    /**
     * Creates a new Color instance from color in rbga format
     *
     * @param color as a rgba for example `rgba(0,158,221,0.5)`, `rgb(0%,62%,86.7%,50%)`
     * @returns Color object
     */
    public static fromRgbaString(rgba: string_color): WithTake<Color> {
        const match = rgba.match(/^rgba\(\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*,\s*([0-9.%-]+)\s*\)$/);
        if (!match) {
            throw new Error(`Invalid rgba string format: "${rgba}"`);
        }

        const parseChannel = (value: string): number => {
            if (value.endsWith('%')) {
                const percent = parseFloat(value);
                return Math.round((percent / 100) * 255);
            } else {
                return Math.round(parseFloat(value));
            }
        };

        const parseAlpha = (value: string): number => {
            if (value.endsWith('%')) {
                const percent = parseFloat(value);
                return Math.round((percent / 100) * 255);
            } else {
                const alphaFloat = parseFloat(value);
                // If alpha is between 0 and 1, treat as float
                if (alphaFloat <= 1) {
                    return Math.round(alphaFloat * 255);
                }
                // Otherwise, treat as 0-255
                return Math.round(alphaFloat);
            }
        };

        const r = parseChannel(match[1]!);
        const g = parseChannel(match[2]!);
        const b = parseChannel(match[3]!);
        const a = parseAlpha(match[4]!);

        return take(new Color(r, g, b, a));
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
        readonly red: number,
        readonly green: number,
        readonly blue: number,
        readonly alpha: number = 255,
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
            return `#${this.red.toString(16).padStart(2, '0')}${this.green.toString(16).padStart(2, '0')}${this.blue
                .toString(16)
                .padStart(2, '0')}`;
        } else {
            return `#${this.red.toString(16).padStart(2, '0')}${this.green.toString(16).padStart(2, '0')}${this.blue
                .toString(16)
                .padStart(2, '0')}${this.alpha.toString(16).padStart(2, '0')}`;
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

/**
 * TODO: [🥻] Split Color class and color type
 * TODO: For each method a corresponding static method should be created
 *       Like clone can be done by color.clone() OR Color.clone(color)
 * TODO: Probably as an independent LIB OR add to LIB xyzt (ask @roseckyj)
 * TODO: !! Transfer back to Collboard (whole directory)
 * TODO: Maybe [🏌️‍♂️] change ACRY toString => (toHex) toRgb when there will be toRgb and toRgba united
 * TODO: Convert getters to methods - getters only for values
 * TODO: Write tests
 * TODO: Getters for alpha, opacity, transparency, r, b, g, h, s, l, a,...
 * TODO: [0] Should be fromRgbString and fromRgbaString one or two functions + one or two regex
 * TODO: Use rgb, rgba, hsl for testing and parsing with the same regex
 * TODO: Regex for rgb, rgba, hsl does not support all options like deg, rad, turn,...
 * TODO: Convolution matrix
 * TODO: Maybe connect with textures
 */
