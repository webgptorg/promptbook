import type { ThinkingLevel } from '../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerAgentName } from '../../src/cli/cli-commands/common/promptRunnerCliOptions';

/**
 * Options for `ptbk agent run-once`, `ptbk agent run-agent`, and `ptbk agent run-multiple`.
 */
export type AgentRunOptions = {
    readonly agentName?: PromptRunnerAgentName;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly noCommit: boolean;
    readonly ignoreGitChanges: boolean;
    readonly normalizeLineEndings: boolean;
    readonly allowCredits: boolean;
    readonly autoPush: boolean;
    readonly autoPull: boolean;
    readonly autoClone: boolean;
};
