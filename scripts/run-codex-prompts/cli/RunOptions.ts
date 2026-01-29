/**
 * CLI options for running the prompt runner.
 */
export type RunOptions = {
    waitForUser: boolean;
    agentName: 'openai-codex' | 'cline' | 'claude-code' | 'opencode';
    model?: string;
};
