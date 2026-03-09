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
    /**
     * Automatically normalize CRLF line endings to LF in files changed during each coding round.
     */
    normalizeLineEndings: boolean;
    /**
     * Allows OpenAI Codex runner to spend credits when needed.
     */
    allowCredits: boolean;
    /**
     * Enables automatic migration of testing servers after each successfully completed prompt.
     */
    autoMigrate: boolean;
    /**
     * Allows auto-migration workflow to continue even when heuristic SQL safety checks detect destructive statements.
     */
    allowDestructiveAutoMigrate: boolean;
    agentName?: 'openai-codex' | 'cline' | 'claude-code' | 'opencode' | 'gemini';
    model?: string;
    /**
     * Minimum prompt priority required for processing.
     */
    priority: number;
};
