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
};
