import { SMALL_NUMBER, VALUE_STRINGS } from '../../config';
import type { string_parameter_value } from '../../types/typeAliases';

/**
 * Format either small or big number
 *
 * @public exported from `@promptbook/utils`
 */
export function numberToString(value: number): string_parameter_value {
    if (value === 0) {
        return '0';
    } else if (Number.isNaN(value)) {
        return VALUE_STRINGS.nan;
    } else if (value === Infinity) {
        return VALUE_STRINGS.infinity;
    } else if (value === -Infinity) {
        return VALUE_STRINGS.negativeInfinity;
    }

    for (let exponent = 0; exponent < 15; exponent++) {
        const factor = 10 ** exponent;
        const valueRounded = Math.round(value * factor) / factor;

        if (Math.abs(value - valueRounded) / value < SMALL_NUMBER) {
            return valueRounded.toFixed(exponent);
        }
    }

    return value.toString();
}
