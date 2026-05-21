import type { ThinkingLevel } from '../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerAgentName } from '../../src/cli/cli-commands/common/promptRunnerCliOptions';
import type { number_port } from '../../src/types/number_positive';

/**
 * Foreground self-hosted runtime options for `ptbk agents-server start`.
 */
export type AgentsServerRunOptions = {
    readonly port: number_port;
    readonly agentName: PromptRunnerAgentName;
    readonly model?: string;
    readonly thinkingLevel?: ThinkingLevel;
    readonly noUi: boolean;
};
