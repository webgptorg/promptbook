import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import type { ClaudeScriptOptions } from './ClaudeScriptOptions';

/**
 * Base delimiter used for passing large prompts through stdin.
 */
const CLAUDE_PROMPT_DELIMITER = 'CLAUDE_PROMPT';

/**
 * Builds the shell script that runs Claude Code with the prompt and coding context.
 */
export function buildClaudeScript(options: ClaudeScriptOptions): string {
    const MODEL_ARGUMENT = options.model ? ` --model ${options.model}` : '';
    const THINKING_LEVEL_ARGUMENT = options.thinkingLevel ? ` --effort ${options.thinkingLevel}` : '';

    return spaceTrim(
        (block) => `
            claude --allowedTools "Bash,Read,Edit,Write"${MODEL_ARGUMENT}${THINKING_LEVEL_ARGUMENT} --output-format json --print <<'${CLAUDE_PROMPT_DELIMITER}'

            ${block(options.prompt)}

            ${CLAUDE_PROMPT_DELIMITER}
        `,
    );
}
