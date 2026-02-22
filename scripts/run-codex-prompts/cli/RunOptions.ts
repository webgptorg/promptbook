/**
 * CLI options for running the prompt runner.
 */
export type RunOptions = {
    /**
     * When true, do not execute prompts and only print prompts that still need to be written.
     */
    dryRun: boolean;
    waitForUser: boolean;
    /**
     * Skip the clean working tree check before running prompts.
     */
    ignoreGitChanges: boolean;
    agentName?: 'openai-codex' | 'cline' | 'claude-code' | 'opencode' | 'gemini';
    model?: string;
    /**
     * Minimum prompt priority required for processing.
     */
    priority: number;
};
