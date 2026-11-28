import type { number_positive } from '../types/number_positive';
import type { number_usd } from '../types/number_usd';

/**
 * Number which can be uncertain
 *
 * Note: [🚉] This is fully serializable as JSON
 * Note: If the value is completelly unknown, the value 0 and isUncertain is true
 * Note: Not using NaN or null because it looses the value which is better to be uncertain then not to be at all
 */
export type UncertainNumber = {
    /**
     * The numeric value
     */
    readonly value: number_usd & (number_positive | 0);

    /**
     * Is the value uncertain
     */
    readonly isUncertain?: true;
};
