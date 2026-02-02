import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';

/**
 * Parses Gemini CLI output and extracts usage information.
 *
 * Note: Gemini CLI output format for usage is currently unknown,
 *       so we return uncertain usage for now.
 */
export function parseGeminiUsageFromOutput(output: string): Usage {
    try {
        // TODO: !!! Implement actual parsing of Gemini CLI output when format is known
        return UNCERTAIN_USAGE;
    } catch (error) {
        console.error(colors.bgRed('Error parsing Gemini usage output:'), error);
        return UNCERTAIN_USAGE;
    }
}
