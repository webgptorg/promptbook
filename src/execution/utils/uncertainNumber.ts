import type { UncertainNumber } from '../PromptResult';

/**
 * Make UncertainNumber
 *
 * @param value
 *
 * @private utility for initializating UncertainNumber
 */
export function uncertainNumber(value?: number | typeof NaN | undefined | null): UncertainNumber {
    if (value === null || value === undefined || Number.isNaN(NaN)) {
        return { value: 0, isUncertain: true };
    }

    return { value };
}
