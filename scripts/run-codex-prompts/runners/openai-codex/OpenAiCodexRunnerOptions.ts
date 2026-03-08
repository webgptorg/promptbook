/**
 * Options for configuring the OpenAI Codex runner.
 */
export type OpenAiCodexRunnerOptions = {
    codexCommand: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    /**
     * Allows Codex to spend credits when rate limits are exhausted.
     */
    allowCredits: boolean;
};
