// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Authentication method that the OpenAI Codex CLI used for one run.
 *
 * - `chatgpt` — the server's ChatGPT account (subscription) login was used.
 * - `api` — `OPENAI_API_KEY` API-key authentication was used.
 * - `unknown` — the runner could not determine which method Codex used.
 *
 * @private internal type of the OpenAI Codex runner and the Agents Server task details
 */
export type CodexLoginMethod = 'chatgpt' | 'api' | 'unknown';

/**
 * Stable stdout marker printed by the generated Codex runner script to report which login method it used.
 *
 * The marker is followed by the resolved method keyword, for example `ptbk-codex-login-method: chatgpt`,
 * so `parseCodexLoginMethodFromOutput` can recover it from the captured runner output.
 *
 * @private internal constant of the OpenAI Codex runner
 */
export const CODEX_LOGIN_METHOD_MARKER = 'ptbk-codex-login-method:';

/**
 * Formats one Codex login method as a short human-readable label for prompt status lines and task details.
 *
 * @returns The label to append to a status line, or `undefined` when there is no meaningful method to show
 * (for example the runner is not Codex or the method could not be determined), so callers can omit the suffix.
 *
 * @private internal utility of the OpenAI Codex runner and the Agents Server task details
 */
export function formatCodexLoginMethod(loginMethod: CodexLoginMethod | undefined): string | undefined {
    switch (loginMethod) {
        case 'chatgpt':
            return 'ChatGPT account';
        case 'api':
            return 'API key';
        default:
            return undefined;
    }
}
