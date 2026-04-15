import type { PromptRoundArtifacts } from './PromptRoundArtifacts';

/**
 * Options for running a temporary script.
 */
export type RunGoScriptOptions = {
    /**
     * Path to the temporary script file.
     */
    scriptPath: string;

    /**
     * Content of the temporary script file.
     */
    scriptContent: string;

    /**
     * Optional path to a live runtime log file that mirrors raw shell input/output during execution.
     */
    logPath?: string;

    /**
     * Optional prompt-round artifact tracker that defers temp-file cleanup until the whole round settles.
     */
    promptRoundArtifacts?: PromptRoundArtifacts;
};
