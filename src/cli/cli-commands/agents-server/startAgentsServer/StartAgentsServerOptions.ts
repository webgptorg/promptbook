import type { number_port } from '../../../../types/number_positive';
import type { ThinkingLevel } from '../../coder/ThinkingLevel';
import type { PromptRunnerHarnessName } from '../../common/promptRunnerCliOptions';

/**
 * Next runtime mode supported by the local Agents Server foreground launcher.
 *
 * @private internal type of `startAgentsServer`
 */
export type AgentsServerNextRuntimeMode = 'start' | 'dev';

/**
 * Options required to start the foreground Agents Server service group.
 *
 * @private internal type of `startAgentsServer`
 */
export type StartAgentsServerOptions = {
    readonly port: number_port;
    readonly agentName: PromptRunnerHarnessName;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly allowCredits: boolean;
    readonly nextRuntimeMode: AgentsServerNextRuntimeMode;
    readonly isBuildForced: boolean;
};

/**
 * Web preparation does not select a permanent coding agent or harness.
 * @private shared Agent Server web startup contract
 */
export type AgentsServerWebStartOptions = Pick<StartAgentsServerOptions, 'port' | 'nextRuntimeMode' | 'isBuildForced'>;
