import type { PromptRoundArtifacts } from '../../common/runGoScript/PromptRoundArtifacts';

/**
 * Options for running a prompt via a runner.
 */
export type PromptRunOptions = {
    prompt: string;
    scriptPath: string;
    projectPath: string;
    logPath?: string;
    promptRoundArtifacts?: PromptRoundArtifacts;
};
