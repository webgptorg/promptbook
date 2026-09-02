/**
 * Options for the Qwen Code runner script.
 */
export type QwenCodeScriptOptions = {
    /**
     * The prompt to be executed.
     */
    readonly prompt: string;

    /**
     * The Qwen Code model to execute the prompt with.
     */
    readonly model: string;
};
