import { Color } from '../Color';
import type { ColorTransformer } from './ColorTransformer';

/**
 * Makes color transformer which sets alpha channel to given color
 *
 * @param alpha number from 0 (transparent) to 1 (opaque)
 * 
 * @public exported from `@promptbook/color`
 */
export function withAlpha(alpha: number): ColorTransformer {
    return ({ red, green, blue }: Color) => {
        return Color.fromValues(red, green, blue, Math.round(alpha * 255));
    };
}
