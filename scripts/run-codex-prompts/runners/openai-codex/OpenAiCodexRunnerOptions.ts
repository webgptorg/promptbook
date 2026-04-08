import type { ThinkingLevel } from '../../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Options for configuring the OpenAI Codex runner.
 */
export type OpenAiCodexRunnerOptions = {
    codexCommand: string;
    model: string;
    /**
     * Optional reasoning effort override. When omitted, Codex keeps the existing default used by Promptbook.
     */
    thinkingLevel?: ThinkingLevel;
    sandbox: string;
    askForApproval: string;
    /**
     * Allows Codex to spend credits when rate limits are exhausted.
     */
    allowCredits: boolean;
};
