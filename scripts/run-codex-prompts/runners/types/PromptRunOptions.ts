import type { WaitForCoderRunPauseCheckpoint } from '../../common/CoderRunPauseCheckpoint';

/**
 * Options for running a prompt via a runner.
 */
export type PromptRunOptions = {
    prompt: string;
    scriptPath: string;
    projectPath: string;
    logPath?: string;
    preserveArtifactsOnSuccess?: boolean;
    waitForPauseCheckpoint?: WaitForCoderRunPauseCheckpoint;
};
