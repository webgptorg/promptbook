import type { ThinkingLevel } from '../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerAgentName } from '../../src/cli/cli-commands/common/promptRunnerCliOptions';

/**
 * Options for `ptbk agent tick` and `ptbk agent run`.
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
};
