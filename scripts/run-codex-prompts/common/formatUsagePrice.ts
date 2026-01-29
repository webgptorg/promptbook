import type { Usage } from '../../../src/execution/Usage';

/**
 * Formats usage price for display in checkbox.
 * Examples:
 *   - "$0.12" (certain)
 *   - "~$3.05" (uncertain)
 *   - "$0.00" (zero cost)
 */
export function formatUsagePrice(usage: Usage): string {
    const price = usage.price.value;
    const isUncertain = usage.price.isUncertain === true;
    const prefix = isUncertain ? '~' : '';

    return `${prefix}$${price.toFixed(2)}`;
}
