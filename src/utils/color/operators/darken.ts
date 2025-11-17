import type { number_percent } from '../../../types/typeAliases';
import type { ColorTransformer } from './ColorTransformer';
import { lighten } from './lighten';

/**
 * Makes color transformer which darker the given color
 *
 * @param amount from 0 to 1
 *
 * @public exported from `@promptbook/color`
 */
export function darken(amount: number_percent): ColorTransformer {
    return lighten(-amount);
}
