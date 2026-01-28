import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { createCodingContext } from '../../common/createCodingContext';
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

            ${block(createCodingContext())}
            

            ${delimiter}
        `,
    );

    // <- TODO: Make "Additional context..." conditional: for example "Attached image ..." based on whether images are present
    // <- TODO: Do the adding of additional context to prompts for all runners, do it in a generic way and keep DRY
}
