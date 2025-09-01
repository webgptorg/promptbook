import type { ColorTransformer } from './ColorTransformer';
import { lighten } from './lighten';

/**
 * Makes color transformer which darker the given color
 *
 * @param amount from 0 to 1
 *
 * @public exported from `@promptbook/color`
 */
export function darken(amount: number): ColorTransformer {
    return lighten(-amount);
}
