import type { string_color } from '../../types/string_person_fullname';
import type { WithTake } from '../take/interfaces/ITakeChain';
import { take } from '../take/take';
import { checkChannelValue } from './internal-utils/checkChannelValue';
import type { Color } from './Color';

/**
 * Shared immutable channel storage and serialization helpers for `Color`.
 *
 * @private base class of Color
 */
export abstract class ColorValue {
    protected constructor(
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
        return take(this.createColor(this.red, this.green, this.blue, this.alpha));
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

    protected abstract createColor(red: number, green: number, blue: number, alpha: number): Color;
}
