/**
 * Options for running an already written script until a completion marker and idle timeout.
 */
export type RunScriptUntilMarkerIdleOptions = {
    /**
     * Path to the temporary script file.
     */
    scriptPath: string;

    /**
     * Matches a line that marks the completion of the command.
     */
    completionLineMatcher: RegExp;

    /**
     * Time to wait for additional output after the completion marker.
     */
    idleTimeoutMs: number;
};
