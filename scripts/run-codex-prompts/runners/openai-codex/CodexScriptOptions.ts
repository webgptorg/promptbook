/**
 * Options for building the Codex shell script.
 */
export type CodexScriptOptions = {
    prompt: string;
    projectPath: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    /**
     * Allows Codex to spend credits when rate limits are exhausted.
     */
    allowCredits: boolean;
    codexCommand: string;
};
