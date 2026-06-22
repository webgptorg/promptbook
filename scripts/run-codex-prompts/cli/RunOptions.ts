import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerHarnessName } from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import type { CoderRunUiSnapshot } from '../ui/CoderRunUiState';

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
     * Milliseconds to wait between prompt rounds to avoid hitting rate limits of the harness.
     * Zero means no waiting between rounds.
     */
    waitBetweenPrompts: number;
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
     * When true, log harness-level messages in addition to the final answer.
     * When false or omitted, only the final answer is printed.
     */
    isVerbose?: boolean;
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
    agentName?: PromptRunnerHarnessName;
    model?: string;
    /**
     * Optional path to an agent `.book` file whose compiled system message is prepended to each codex prompt.
     * Supports the same path resolution as `--context`: relative to the current working directory.
     */
    agent?: string;
    /**
     * Minimum prompt priority required for processing.
     */
    priority: number;
    /**
     * When true, the run loop continues watching for new prompts instead of exiting when none are available.
     * Used by `ptbk coder server` to keep the process alive as a server.
     */
    keepAlive?: boolean;
    /**
     * Optional URL to show in the shared rich terminal UI when `ptbk coder server` is active.
     */
    serverUrl?: string;
    /**
     * Optional observer for the current runner UI state, used by `ptbk coder server` to expose live terminal progress.
     */
    onUiSnapshotChange?: (snapshot: CoderRunUiSnapshot) => void;
};
