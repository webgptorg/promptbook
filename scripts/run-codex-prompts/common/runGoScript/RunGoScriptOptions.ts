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
     * Keeps temporary prompt artifacts after successful execution instead of deleting them immediately.
     */
    preserveArtifactsOnSuccess?: boolean;
};
