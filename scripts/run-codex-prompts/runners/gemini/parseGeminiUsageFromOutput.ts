import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { uncertainNumber } from '../../../../src/execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE, UNCERTAIN_ZERO_VALUE } from '../../../../src/execution/utils/usage-constants';
import { CHARS_PER_TOKEN, GEMINI_MODEL_FOR_ESTIMATION, GEMINI_PRICING } from './gemini-pricing';

/**
 * Parses Gemini CLI output and extracts usage information.
 *
 * @param output The output from the Gemini CLI.
 * @param prompt The prompt that was sent to the Gemini CLI.
 */
export function parseGeminiUsageFromOutput(output: string, prompt: string): Usage {
    try {
        const model = GEMINI_MODEL_FOR_ESTIMATION;
        const pricing = GEMINI_PRICING[model];

        const inputTokens = Math.ceil(prompt.length / CHARS_PER_TOKEN);
        const outputTokens = Math.ceil(output.length / CHARS_PER_TOKEN);

        const price = uncertainNumber(
            (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output,
        );

        return {
            price,
            input: UNCERTAIN_ZERO_VALUE,
            output: UNCERTAIN_ZERO_VALUE,
            // input: {
            //     tokensCount: uncertainNumber(inputTokens),
            // },
            // output: {
            //     tokensCount: uncertainNumber(outputTokens),
            // },
        };
    } catch (error) {
        console.error(colors.bgRed('Error parsing Gemini usage output:'), error);
        return UNCERTAIN_USAGE;
    }
}
