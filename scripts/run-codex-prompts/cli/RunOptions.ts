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
     * Optional reasoning effort override for runners that support configurable thinking levels.
     */
    thinkingLevel?: ThinkingLevel;
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
     * Keeps generated runner shells and runtime logs after successful prompt rounds.
     */
    preserveLogs: boolean;
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
    agentName?: 'openai-codex' | 'github-copilot' | 'cline' | 'claude-code' | 'opencode' | 'gemini';
    model?: string;
    /**
     * Minimum prompt priority required for processing.
     */
    priority: number;
};
