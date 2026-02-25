/**
 * Prompt parameter key used by Agents Server client to pass GitHub token to server runtime context.
 */
export const PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER = 'promptbookProjectGithubToken';

/**
 * Parses GitHub token prompt parameter into a normalized token string.
 */
export function parseProjectGithubTokenPromptParameter(rawValue: unknown): string | undefined {
    if (typeof rawValue !== 'string') {
        return undefined;
    }

    const normalizedValue = rawValue.trim();
    return normalizedValue || undefined;
}
