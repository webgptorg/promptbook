import colors from 'colors';
import type { Usage } from '../../../../src/execution/Usage';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { TODO_any } from '../../../../src/utils/organization/TODO_any';

/**
 * Claude Code JSON output structure
 */
type ClaudeCodeJsonOutput = {
    type: 'result';
    subtype: 'success' | 'error';
    is_error: boolean;
    duration_ms: number;
    duration_api_ms: number;
    num_turns: number;
    result: string;
    session_id: string;
    total_cost_usd: number;
    usage: {
        input_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
        output_tokens: number;
        server_tool_use: {
            web_search_requests: number;
            web_fetch_requests: number;
        };
        service_tier: string;
        cache_creation?: {
            ephemeral_1h_input_tokens: number;
            ephemeral_5m_input_tokens: number;
        };
    };
    modelUsage?: Record<string, TODO_any>;
    permission_denials: Array<TODO_any>;
    uuid: string;
};

/**
 * Parses Claude Code JSON output and extracts usage information
 *
 * @private within the run-codex-prompts script
 */
export function parseClaudeCodeJsonOutput(output: string): Usage {
    try {
        // Extract JSON from the output - it should be a line starting with {"type":"result"
        const lines = output.split('\n');
        const jsonLine = lines.find((line) => line.trim().startsWith('{"type":"result"'));

        if (!jsonLine) {
            return UNCERTAIN_USAGE;
        }

        const parsed = JSON.parse(jsonLine) as ClaudeCodeJsonOutput;

        if (parsed.type !== 'result') {
            return UNCERTAIN_USAGE;
        }

        const totalInputTokens =
            (parsed.usage?.input_tokens || 0) +
            (parsed.usage?.cache_creation_input_tokens || 0) +
            (parsed.usage?.cache_read_input_tokens || 0);

        const totalOutputTokens = parsed.usage?.output_tokens || 0;

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
    } catch (error) {
        console.error(colors.bgRed('Error parsing Claude Code JSON output:'), error);

        // If JSON parsing fails, return uncertain usage
        return UNCERTAIN_USAGE;
    }
}
