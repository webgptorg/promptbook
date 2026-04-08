import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import type { ClaudeScriptOptions } from './ClaudeScriptOptions';

/**
 * Builds the shell script that runs Claude Code with the prompt and coding context.
 */
export function buildClaudeScript(options: ClaudeScriptOptions): string {
    const delimiter = 'CLAUDE_PROMPT';

    return spaceTrim(
        (block) => `
            claude --allowedTools "Bash,Read,Edit,Write" --output-format json --print <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
