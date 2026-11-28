import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { findClaudeCodeResultEvent } from './parseClaudeCodeOutputEvents';

/**
 * Parses Claude Code JSON output and extracts usage information.
 */
export function parseClaudeCodeJsonOutput(output: string): Usage {
    try {
        const parsed = findClaudeCodeResultEvent(output);

        if (!parsed) {
            return UNCERTAIN_USAGE;
        }

        const totalInputTokens =
            (parsed.usage?.input_tokens || 0) +
            (parsed.usage?.cache_creation_input_tokens || 0) +
            (parsed.usage?.cache_read_input_tokens || 0);

        const totalOutputTokens = parsed.usage?.output_tokens || 0;

        return {
            duration: { value: 0 /* <- TODO: [🚍] Duration is recorded through side channel, pass it through Usage */ },
            price: {
                value: parsed.total_cost_usd || 0,
                ...(parsed.total_cost_usd === undefined && { isUncertain: true }),
            },
            input: {
                tokensCount: {
                    value: totalInputTokens,
                },
                charactersCount: { value: 0 },
                wordsCount: { value: 0 },
                sentencesCount: { value: 0 },
                linesCount: { value: 0 },
                paragraphsCount: { value: 0 },
                pagesCount: { value: 0 },
            },
            output: {
                tokensCount: {
                    value: totalOutputTokens,
                },
                charactersCount: { value: 0 },
                wordsCount: { value: 0 },
                sentencesCount: { value: 0 },
                linesCount: { value: 0 },
                paragraphsCount: { value: 0 },
                pagesCount: { value: 0 },
            },
        };
    } catch (error) {
        console.error(colors.bgRed('Error parsing Claude Code JSON output:'), error);

        // If JSON parsing fails, return uncertain usage
        return UNCERTAIN_USAGE;
    }
}
