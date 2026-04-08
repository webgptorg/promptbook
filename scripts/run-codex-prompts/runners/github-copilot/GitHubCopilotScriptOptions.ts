import type { ThinkingLevel } from '../../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Options for building a GitHub Copilot CLI script.
 */
export type GitHubCopilotScriptOptions = {
    prompt: string;
    projectPath: string;
    model?: string;
    /**
     * Optional reasoning effort override forwarded to GitHub Copilot CLI.
     */
    thinkingLevel?: ThinkingLevel;
};
