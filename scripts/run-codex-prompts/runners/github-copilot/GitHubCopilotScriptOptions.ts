/**
 * Options for building a GitHub Copilot CLI script.
 */
export type GitHubCopilotScriptOptions = {
    prompt: string;
    projectPath: string;
    model?: string;
};
