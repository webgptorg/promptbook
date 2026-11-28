import type { UncertainNumber } from '../UncertainNumber';
import { UNCERTAIN_ZERO_VALUE } from './usage-constants';

/**
 * Make UncertainNumber
 *
 * @param value value of the uncertain number, if `NaN` or `undefined`, it will be set to 0 and `isUncertain=true`
 * @param isUncertain if `true`, the value is uncertain, otherwise depends on the value
 *
 * @private utility for initializating UncertainNumber
 */
export function uncertainNumber(
    value?: number | typeof NaN | undefined | null,
    isUncertain?: boolean,
): UncertainNumber {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return UNCERTAIN_ZERO_VALUE;
    }

    if (isUncertain === true) {
        return { value, isUncertain };
    }

    return { value };
}
