import type { ThinkingLevel } from '../../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Options for building the Codex shell script.
 */
export type CodexScriptOptions = {
    prompt: string;
    projectPath: string;

    /**
     * Optional model override. When omitted, Codex is started without `--model` and keeps the model of its own
     * configuration, which is the only thing a ChatGPT-account login accepts.
     */
    model?: string;
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
    /**
     * Requests Codex JSONL events so a trusted consumer can render concise live progress.
     */
    isMachineReadableProgressEnabled?: boolean;
    codexCommand: string;
};
