import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { resolveShellHereDocumentDelimiter } from '../../common/runGoScript/resolveShellHereDocumentDelimiter';
import type { ClaudeScriptOptions } from './ClaudeScriptOptions';

/**
 * Base delimiter used for passing large prompts through stdin.
 */
const CLAUDE_PROMPT_DELIMITER = 'CLAUDE_PROMPT';

/**
 * Builds the shell script that runs Claude Code with the prompt and coding context.
 */
export function buildClaudeScript(options: ClaudeScriptOptions): string {
    const delimiter = resolveShellHereDocumentDelimiter(CLAUDE_PROMPT_DELIMITER, options.prompt);
    const MODEL_ARGUMENT = options.model ? ` --model ${options.model}` : '';
    const THINKING_LEVEL_ARGUMENT = options.thinkingLevel ? ` --effort ${options.thinkingLevel}` : '';
    const RESUME_SESSION_ARGUMENT = options.resumeSessionId
        ? ` --resume ${quoteShellArgument(options.resumeSessionId)}`
        : '';

    return spaceTrim(
        (block) => `
            claude --allowedTools "Bash,Read,Edit,Write"${MODEL_ARGUMENT}${THINKING_LEVEL_ARGUMENT}${RESUME_SESSION_ARGUMENT} --output-format stream-json --verbose --include-partial-messages --print <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}

/**
 * Quotes one shell argument for the generated Bash script.
 */
function quoteShellArgument(value: string): string {
    return JSON.stringify(value);
}
