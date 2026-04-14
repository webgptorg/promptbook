import type { ThinkingLevel } from '../../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Options for the GitHub Copilot runner.
 */
export type GitHubCopilotRunnerOptions = {
    model?: string;
    /**
     * Optional reasoning effort override forwarded to GitHub Copilot CLI.
     */
    thinkingLevel?: ThinkingLevel;
};
