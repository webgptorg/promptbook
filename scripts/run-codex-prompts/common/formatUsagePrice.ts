import type { Usage } from '../../../src/execution/Usage';

/**
 * Formats usage price for display in checkbox.
 * Examples:
 *   - "$0.12" (certain)
 *   - "~$3.05" (uncertain)
 *   - "$0.00" (zero cost)
 *   - "<$0.01" (tiny non-zero cost)
 */
export function formatUsagePrice(usage: Usage): string {
    const price = usage.price.value;
    const isUncertain = usage.price.isUncertain === true;
    const prefix = isUncertain ? '~' : '';

    if (price === 0) {
        return `${prefix}$0.00`;
    }

    if (price < 0.01) {
        return `${prefix}<$0.01`;
    }

    if (price < 1) {
        return `${prefix}$${price.toFixed(4)}`;
    }

    return `${prefix}$${price.toFixed(2)}`;
}
