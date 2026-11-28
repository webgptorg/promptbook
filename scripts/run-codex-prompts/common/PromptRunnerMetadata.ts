/**
 * Who runs the prompts of one coder run, as it is reported in prompt status lines and run traces.
 *
 * The harness and its model come from `--harness` and `--model`, the Book agent is present only when the run
 * is personalized with `--agent`.
 */
export type PromptRunnerMetadata = {
    /**
     * Human-readable name of the harness which runs the prompt, for example `OpenAI Codex`.
     */
    readonly runnerName: string;

    /**
     * Model the harness runs the prompt with, when the harness works with an explicit model.
     */
    readonly modelName?: string;

    /**
     * Human-readable name of the Book agent selected with `--agent`, for example `Developer`.
     */
    readonly agentName?: string;
};
