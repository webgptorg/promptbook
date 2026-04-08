import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { CodexScriptOptions } from './CodexScriptOptions';

/**
 * Default Codex reasoning effort preserved for backwards compatibility when no CLI override is provided.
 */
const DEFAULT_CODEX_THINKING_LEVEL = 'xhigh';

/**
 * Builds the shell script that runs Codex with the prompt and coding context.
 */
export function buildCodexScript(options: CodexScriptOptions): string {
    const delimiter = 'CODEX_PROMPT';
    const projectPath = toPosixPath(options.projectPath);
    const loginMethodConfig = options.allowCredits ? '' : '  -c forced_login_method=chatgpt \\';
    const thinkingLevel = options.thinkingLevel ?? DEFAULT_CODEX_THINKING_LEVEL;
    const modelReasoningEffortConfig = `  -c model_reasoning_effort="${thinkingLevel}" \\`;

    return spaceTrim(
        (block) => `

            if [ -f .env ]; then
            set -a
            source .env
            set +a
            fi

            unset OPENAI_API_KEY
            unset OPENAI_BASE_URL

            ${options.codexCommand} \\
                ${loginMethodConfig}
                ${modelReasoningEffortConfig}
                --ask-for-approval ${options.askForApproval} \\
                exec --model ${options.model} \\
                --local-provider none \\
                --sandbox ${options.sandbox} \\
                -C ${projectPath} \\
                <<'${delimiter}'

            ${block(options.prompt)}

            ${delimiter}
        `,
    );
}
