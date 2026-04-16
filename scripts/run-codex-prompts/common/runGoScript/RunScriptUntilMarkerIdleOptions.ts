/**
 * Options for running an already written script until a completion marker and idle timeout.
 */
export type RunScriptUntilMarkerIdleOptions = {
    /**
     * Path to the temporary script file.
     */
    scriptPath: string;

    /**
     * Content of the temporary script file.
     */
    scriptContent: string;

    /**
     * Matches a line that marks the completion of the command.
     */
    completionLineMatcher: RegExp;

    /**
     * Time to wait for additional output after the completion marker.
     */
    idleTimeoutMs: number;

    /**
     * Optional path to a live runtime log file that mirrors raw shell input/output during execution.
     */
    logPath?: string;

    /**
     * Keeps temporary prompt artifacts after successful execution instead of deleting them immediately.
     */
    preserveArtifactsOnSuccess?: boolean;
};
