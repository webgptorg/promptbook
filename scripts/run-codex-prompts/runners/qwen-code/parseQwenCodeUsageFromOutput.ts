import type { Usage } from '../../../../src/execution/Usage';
import { estimateUsageFromTextLength } from '../common/estimateUsageFromTextLength';
import { resolveQwenCodePricing } from './qwen-code-pricing';

/**
 * Parses Qwen Code CLI output and extracts usage information.
 *
 * @param output The output from the Qwen Code CLI.
 * @param prompt The prompt that was sent to the Qwen Code CLI.
 * @param modelName The Qwen Code model used for this run.
 */
export function parseQwenCodeUsageFromOutput(output: string, prompt: string, modelName?: string): Usage {
    return estimateUsageFromTextLength({
        harnessLabel: 'Qwen Code',
        prompt,
        output,
        resolvePricing: () => resolveQwenCodePricing(modelName),
    });
}
