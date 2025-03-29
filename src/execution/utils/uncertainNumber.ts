import type { UncertainNumber } from '../UncertainNumber';
import { UNCERTAIN_ZERO_VALUE } from './usage-constants';

/**
 * Make UncertainNumber
 *
 * @param value
 *
 * @private utility for initializating UncertainNumber
 */
export function uncertainNumber(value?: number | typeof NaN | undefined | null): UncertainNumber {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return UNCERTAIN_ZERO_VALUE;
    }

    return { value };
}
