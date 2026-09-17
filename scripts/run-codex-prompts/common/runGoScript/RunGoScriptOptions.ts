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
     * Mirrors live shell stdout/stderr to the terminal while the script is running.
     */
    shouldPrintLiveOutput?: boolean;

    /**
     * Keeps temporary prompt artifacts after successful execution instead of deleting them immediately.
     */
    preserveArtifactsOnSuccess?: boolean;

    /**
     * Observes every completed output line while the script is still running.
     *
     * The captured output is returned only after the script has finished, so this is the single way of reacting to
     * something the harness reports in the middle of a long prompt.
     */
    onOutputLine?(line: string): void;
};
