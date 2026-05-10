import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * CLI options for running the prompt runner.
 */
export type RunOptions = {
    /**
     * When true, do not execute prompts and only print prompts that still need to be written.
     */
    dryRun: boolean;
    /**
     * Additional runner instructions provided either inline or as a file path.
     */
    context?: string;
    /**
     * Optional verification command executed after each prompt attempt.
     */
    testCommand?: string;
    /**
     * Keeps generated prompt/debug artifacts after a successful round instead of cleaning them up.
     */
    preserveLogs: boolean;
    /**
     * Disables the rich terminal UI so runner output streams directly to the console.
     */
    noUi: boolean;
    /**
     * Optional reasoning effort override for runners that support configurable thinking levels.
     */
    thinkingLevel?: ThinkingLevel;
    waitForUser: boolean;
    /**
     * Leave successful round changes in the git working tree instead of creating an agent commit.
     */
    noCommit: boolean;
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
    /**
     * When true, push each successful coding-agent commit to the configured remote.
     */
    autoPush: boolean;
    /**
     * When true, pull the latest repository changes before processing prompts.
     */
    autoPull: boolean;
    agentName?: 'openai-codex' | 'github-copilot' | 'cline' | 'claude-code' | 'opencode' | 'gemini';
    model?: string;
    /**
     * Minimum prompt priority required for processing.
     */
    priority: number;
};
