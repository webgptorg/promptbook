import type { RunGoScriptOptions } from './RunGoScriptOptions';

/**
 * Options for running a temporary script until a completion marker and idle timeout.
 */
export type RunGoScriptUntilMarkerIdleOptions = RunGoScriptOptions & {
    /**
     * Matches a line that marks the completion of the command.
     */
    completionLineMatcher: RegExp;

    /**
     * Time to wait for additional output after the completion marker.
     */
    idleTimeoutMs: number;
};
