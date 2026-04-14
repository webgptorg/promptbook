import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import type { ClaudeScriptOptions } from './ClaudeScriptOptions';

/**
 * Builds the shell script that runs Claude Code with the prompt and coding context.
 */
export function buildClaudeScript(options: ClaudeScriptOptions): string {
    const delimiter = 'CLAUDE_PROMPT';
    const outputArguments = options.streamOutput
        ? '--output-format stream-json --include-partial-messages'
        : '--output-format json';

    return spaceTrim(
        (block) => `
            claude --allowedTools "Bash,Read,Edit,Write" ${outputArguments} --print <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
