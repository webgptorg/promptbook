import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { toPosixPath } from '../../common/runGoScript/toPosixPath';
import type { CodexScriptOptions } from './CodexScriptOptions';

/**
 * Default Codex reasoning effort preserved for backwards compatibility when no CLI override is provided.
 */
const DEFAULT_CODEX_THINKING_LEVEL = 'xhigh';

/**
 * Base delimiter used for passing large prompts through stdin.
 */
const CODEX_PROMPT_DELIMITER = 'CODEX_PROMPT';

/**
 * Builds the shell script that runs Codex with the prompt and coding context.
 */
export function buildCodexScript(options: CodexScriptOptions): string {
    const delimiter = resolveShellHereDocumentDelimiter(CODEX_PROMPT_DELIMITER, options.prompt);
    const projectPath = toPosixPath(options.projectPath);
    const loginMethodConfig = spaceTrim(`
        ${options.allowCredits ? 'CODEX_LOGIN_METHOD_ARGUMENTS=()' : 'CODEX_LOGIN_METHOD_ARGUMENTS=(-c forced_login_method=chatgpt)'}
        if [ "\${PTBK_OPENAI_CODEX_USE_API_KEY:-0}" = "1" ] && [ -n "\${OPENAI_API_KEY:-}" ]; then
            CODEX_LOGIN_METHOD_ARGUMENTS=(-c forced_login_method=api)
        fi
    `);
    const thinkingLevel = options.thinkingLevel ?? DEFAULT_CODEX_THINKING_LEVEL;
    const lines = [
        'if [ -n "${PTBK_AGENTS_SERVER_ENV_FILE:-}" ] && [ -f "${PTBK_AGENTS_SERVER_ENV_FILE}" ]; then',
        'set -a',
        'source "${PTBK_AGENTS_SERVER_ENV_FILE}"',
        'set +a',
        'elif [ -f .env ]; then',
        'set -a',
        'source .env',
        'set +a',
        'fi',
        '',
        loginMethodConfig,
        '',
        'if [ "${PTBK_OPENAI_CODEX_USE_API_KEY:-0}" != "1" ] || [ -z "${OPENAI_API_KEY:-}" ]; then',
        'unset OPENAI_API_KEY',
        'unset OPENAI_BASE_URL',
        'fi',
        '',
        `${options.codexCommand} \\`,
        '    "${CODEX_LOGIN_METHOD_ARGUMENTS[@]}" \\',
        `    -c model_reasoning_effort="${thinkingLevel}" \\`,
        `    --ask-for-approval ${options.askForApproval} \\`,
        `    exec --model ${options.model} \\`,
        '    --local-provider none \\',
        `    --sandbox ${options.sandbox} \\`,
        `    -C ${projectPath} \\`,
        '    --skip-git-repo-check \\',
        `    <<'${delimiter}'`,
        '',
        options.prompt,
        '',
        delimiter,
    ];

    return lines.join('\n');
}

/**
 * Resolves a here-document delimiter that cannot be confused with a line inside the prompt.
 */
function resolveShellHereDocumentDelimiter(baseDelimiter: string, content: string): string {
    let delimiter = baseDelimiter;
    let delimiterSuffix = 0;

    while (isShellHereDocumentDelimiterPresent(content, delimiter)) {
        delimiterSuffix += 1;
        delimiter = `${baseDelimiter}_${delimiterSuffix}`;
    }

    return delimiter;
}

/**
 * Checks whether a prompt already contains one exact here-document closing delimiter line.
 */
function isShellHereDocumentDelimiterPresent(content: string, delimiter: string): boolean {
    return content.replace(/\r\n/gu, '\n').split('\n').some((line) => line === delimiter);
}
