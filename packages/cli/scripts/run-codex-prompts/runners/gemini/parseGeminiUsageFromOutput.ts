import type { Usage } from '../../../../src/execution/Usage';
import { estimateUsageFromTextLength } from '../common/estimateUsageFromTextLength';
import { resolveGeminiPricing } from './gemini-pricing';

/**
 * Parses Gemini CLI output and extracts usage information.
 *
 * @param output The output from the Gemini CLI.
 * @param prompt The prompt that was sent to the Gemini CLI.
 * @param modelName The Gemini model used for this run.
 */
export function parseGeminiUsageFromOutput(output: string, prompt: string, modelName?: string): Usage {
    return estimateUsageFromTextLength({
        harnessLabel: 'Gemini',
        prompt,
        output,
        resolvePricing: () => resolveGeminiPricing(modelName),
    });
}
