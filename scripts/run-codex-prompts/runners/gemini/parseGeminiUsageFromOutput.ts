import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { uncertainNumber } from '../../../../src/execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { CHARS_PER_TOKEN, resolveGeminiPricing } from './gemini-pricing';

/**
 * Parses Gemini CLI output and extracts usage information.
 *
 * @param output The output from the Gemini CLI.
 * @param prompt The prompt that was sent to the Gemini CLI.
 * @param modelName The Gemini model used for this run.
 */
export function parseGeminiUsageFromOutput(output: string, prompt: string, modelName?: string): Usage {
    try {
        const pricing = resolveGeminiPricing(modelName);

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
        console.error(colors.bgRed('Error parsing Gemini usage output:'), error);
        return UNCERTAIN_USAGE;
    }
}
