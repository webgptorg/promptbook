import type { WaitForCoderRunPauseCheckpoint } from '../../common/CoderRunPauseCheckpoint';

/**
 * Options for running a prompt via a runner.
 */
export type PromptRunOptions = {
    prompt: string;
    scriptPath: string;
    projectPath: string;
    logPath?: string;
    shouldPrintLiveOutput?: boolean;
    preserveArtifactsOnSuccess?: boolean;
    waitForPauseCheckpoint?: WaitForCoderRunPauseCheckpoint;
    /** Cancels this invocation and its process tree, including delegated consultations. */
    readonly signal?: AbortSignal;
};
