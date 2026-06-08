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
    const loginMethodConfig = options.allowCredits
        ? 'CODEX_LOGIN_METHOD_ARGUMENTS=()'
        : spaceTrim(`
              CODEX_LOGIN_METHOD_ARGUMENTS=(-c forced_login_method=chatgpt)
              if [ "\${PTBK_OPENAI_CODEX_USE_API_KEY:-0}" = "1" ] && [ -n "\${OPENAI_API_KEY:-}" ]; then
                  CODEX_LOGIN_METHOD_ARGUMENTS=()
              fi
          `);
    const thinkingLevel = options.thinkingLevel ?? DEFAULT_CODEX_THINKING_LEVEL;
    const modelReasoningEffortConfig = `  -c model_reasoning_effort="${thinkingLevel}" \\`;

    return spaceTrim(
        (block) => `

            if [ -f .env ]; then
            set -a
            source .env
            set +a
            fi

            ${loginMethodConfig}

            if [ "\${PTBK_OPENAI_CODEX_USE_API_KEY:-0}" != "1" ] || [ -z "\${OPENAI_API_KEY:-}" ]; then
            unset OPENAI_API_KEY
            unset OPENAI_BASE_URL
            fi

            ${options.codexCommand} \\
                "\${CODEX_LOGIN_METHOD_ARGUMENTS[@]}" \\
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
