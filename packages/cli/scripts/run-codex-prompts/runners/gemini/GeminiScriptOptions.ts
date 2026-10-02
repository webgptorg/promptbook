/**
 * Options for the Gemini runner.
 */
export type GeminiScriptOptions = {
    /**
     * The prompt to be executed.
     */
    readonly prompt: string;
    /**
     * The Gemini model to execute the prompt with.
     */
    readonly model: string;
};
