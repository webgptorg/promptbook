import type { GitChangesMode } from '../../src/cli/cli-commands/coder/GitChangesMode';
import type { ThinkingLevel } from '../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerHarnessName } from '../../src/cli/cli-commands/common/promptRunnerCliOptions';

/**
 * Options for `ptbk agent-folder run-once`, `ptbk agent-folder run-agent`, and `ptbk agent-folder run-multiple`.
 */
export type AgentRunOptions = {
    readonly agentName?: PromptRunnerHarnessName;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly noCommit: boolean;

    /**
     * Decides what happens when the working tree has uncommitted changes before a message round starts.
     *
     * An agent folder answers queued messages instead of running a prompt queue, so there is no interrupted
     * prompt to resume here and `continue` keeps the changes exactly like `ignore` does.
     */
    readonly gitChanges: GitChangesMode;
    readonly normalizeLineEndings: boolean;
    readonly allowCredits: boolean;
    readonly autoPush: boolean;
    readonly autoPull: boolean;
    readonly autoClone: boolean;
    readonly ignorePatterns?: readonly string[];
    readonly maxMessageProcessingFailures?: number;
    readonly maxParallelMessages?: number;
    /**
     * Requests machine-readable harness events for safe, user-facing runtime progress reporting.
     *
     * The Agents Server uses these events only to update the active chat's brief progress line.
     */
    readonly isMachineReadableProgressEnabled?: boolean;
};
