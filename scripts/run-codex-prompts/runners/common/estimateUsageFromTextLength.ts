import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { uncertainNumber } from '../../../../src/execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import type { ModelPricing } from './modelPricing';

/**
 * An estimation of how many characters are in one token.
 */
const CHARS_PER_TOKEN = 4;

/**
 * Options for estimating the usage of one harness run.
 */
export type EstimateUsageFromTextLengthOptions = {
    /**
     * Human-readable harness name used when the estimation itself fails.
     */
    readonly harnessLabel: string;

    /**
     * The prompt that was sent to the harness.
     */
    readonly prompt: string;

    /**
     * The output which the harness has printed.
     */
    readonly output: string;

    /**
     * Reads the pricing of the model which was used for this run.
     *
     * It is resolved lazily so that a broken pricing table degrades to an uncertain estimate
     * instead of failing the coding round, because a price estimate must never block coding work.
     */
    readonly resolvePricing: () => ModelPricing;
};

/**
 * Estimates the usage of one harness run from the length of its prompt and its output.
 *
 * Harnesses which do not report their own token counts are billed per token anyway, so the
 * character counts are the only signal available for a price estimate.
 */
export function estimateUsageFromTextLength(options: EstimateUsageFromTextLengthOptions): Usage {
    const { harnessLabel, prompt, output, resolvePricing } = options;

    try {
        const pricing = resolvePricing();

        const inputTokens = Math.ceil(prompt.length / CHARS_PER_TOKEN);
        const outputTokens = Math.ceil(output.length / CHARS_PER_TOKEN);

        const price = uncertainNumber(
            (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output,
        );

        return {
            ...UNCERTAIN_USAGE,
            price,
            input: {
                ...UNCERTAIN_USAGE.input,
                tokensCount: uncertainNumber(inputTokens),
            },
            output: {
                ...UNCERTAIN_USAGE.output,
                tokensCount: uncertainNumber(outputTokens),
            },
        };
    } catch (error) {
        console.error(colors.bgRed(`Error parsing ${harnessLabel} usage output:`), error);
        return UNCERTAIN_USAGE;
    }
}
