import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';

/**
 * Parses Opencode JSON output and extracts usage information
 *
 * @private within the run-codex-prompts script
 */
export function parseOpencodeJsonOutput(output: string): Usage {
    try {
        // Extract JSON from the output - it should be a line starting with {"type":"result" or similar
        // Based on ClaudeCodeRunner, it looks for a specific line.
        // For Opencode, we'll try to find the last valid JSON object in the output
        const lines = output.split('\n');
        
        // Let's assume Opencode output might have multiple JSON lines (events) and the result is one of them
        // or it's a single JSON object if --format json is used.
        
        const jsonLine = lines.reverse().find((line) => line.trim().startsWith('{') && line.trim().endsWith('}'));

        if (!jsonLine) {
            return UNCERTAIN_USAGE;
        }

        const parsed = JSON.parse(jsonLine);

        // Based on the documentation, opencode stats --format json might be useful too, 
        // but here we are parsing the output of 'run'.
        
        // If Opencode follows a similar structure to Claude Code:
        if (parsed.usage) {
             const totalInputTokens =
                (parsed.usage.input_tokens || 0) +
                (parsed.usage.cache_creation_input_tokens || 0) +
                (parsed.usage.cache_read_input_tokens || 0);

            const totalOutputTokens = parsed.usage.output_tokens || 0;

            return {
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
        }

        return UNCERTAIN_USAGE;
    } catch (error) {
        console.error(colors.bgRed('Error parsing Opencode JSON output:'), error);
        return UNCERTAIN_USAGE;
    }
}
