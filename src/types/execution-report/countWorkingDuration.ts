import { FromtoItems } from '../../utils/FromtoItems';

/**
 * Count the duration of working time
 *
 * @private within the library
 */
export function countWorkingDuration(items: FromtoItems): number {
    const steps = Array.from(new Set(items.flatMap((item) => [item.from, item.to])));
    steps.sort((a, b) => a - b);
    const intervals = steps.map((step, index) => [step, steps[index + 1] || 0] as const).slice(0, -1);

    let duration = 0;

    for (const interval of intervals) {
        const [from, to] = interval;
        if (items.some((item) => item.from < to && item.to > from)) {
            duration += to - from;
        }
    }

    return duration;
}
