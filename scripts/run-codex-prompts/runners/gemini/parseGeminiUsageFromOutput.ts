import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
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

        const price = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

        return {
            price,
            inputTokens,
            outputTokens,
        };
    } catch (error) {
        console.error(colors.bgRed('Error parsing Gemini usage output:'), error);
        return UNCERTAIN_USAGE;
    }
}
