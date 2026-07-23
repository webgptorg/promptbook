import moment from 'moment';
import { formatUsagePrice } from '../../../src/execution/utils/formatUsagePrice';
import type { CoderRunStep, CoderRunStepKind } from '../common/CoderRunStep';

/**
 * Human-readable labels for each coder run step kind shown in prompt status lines.
 */
const CODER_RUN_STEP_LABELS: Record<CoderRunStepKind, string> = {
    implementation: 'Implementation',
    testing: 'Testing',
    fixing: 'Fixing',
};

/**
 * Formats the per-step usage breakdown recorded for one finished prompt.
 *
 * Produces a `; `-separated summary such as
 * `Implementation $8.01 6 hours; Testing 1 hour; Fixing $3.14 2 hours` where each coding step carries its
 * price and duration and each verification step carries only its duration.
 */
export function formatCoderRunSteps(steps: ReadonlyArray<CoderRunStep>): string {
    return steps.map(formatCoderRunStep).join('; ');
}

/**
 * Formats one coder run step as `Label $price duration`, omitting the price for steps without model usage.
 */
function formatCoderRunStep(step: CoderRunStep): string {
    const label = CODER_RUN_STEP_LABELS[step.kind];
    const durationString = moment.duration(step.durationMs).humanize();
    const priceString = step.usage === null ? undefined : formatUsagePrice(step.usage);

    if (priceString === undefined) {
        return `${label} ${durationString}`;
    }

    return `${label} ${priceString} ${durationString}`;
}
