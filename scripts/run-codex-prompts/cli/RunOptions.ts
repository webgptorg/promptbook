import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerHarnessName } from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import type { PriorityFilter } from '../prompts/priorityFilter';
import type { CoderRunUiState } from '../ui/CoderRunUiState';

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
     * Milliseconds to wait after one prompt has been implemented, verified and committed before the next prompt starts.
     * Zero means no waiting after a prompt.
     */
    waitAfterPrompt: number;
    /**
     * Milliseconds to wait between the start of one prompt and the start of the next prompt, regardless of how long the task itself takes.
     * If the task takes longer than this value, the next prompt starts immediately. Zero means no per-cycle pacing.
     */
    waitBetweenPrompts: number;
    /**
     * Milliseconds to wait before retrying a prompt after an error occurs.
     * Zero means retry immediately.
     */
    waitAfterError: number;
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
     * Legacy alias for `minimumPriority`.
     */
    priority: number;
    /**
     * Optional minimum prompt priority required for processing.
     */
    minimumPriority?: number;
    /**
     * Optional maximum prompt priority allowed for processing.
     */
    maximumPriority?: number;
    /**
     * Normalized prompt priority filter.
     */
    priorityFilter?: PriorityFilter;
    /**
     * Optional maximum number of successful prompt runs to process before stopping.
     */
    limit?: number;
    /**
     * Optional HTTP server URL shown in the rich terminal UI for `ptbk coder server`.
     */
    serverUrl?: string;
    /**
     * Optional shared run-state object used by `ptbk coder server` to expose terminal progress over HTTP.
     */
    uiState?: CoderRunUiState;
    /**
     * When true, the run loop continues watching for new prompts instead of exiting when none are available.
     * Used by `ptbk coder server` to keep the process alive as a server.
     */
    keepAlive?: boolean;
};
