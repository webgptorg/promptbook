import type { PromptStatus } from './PromptStatus';

/**
 * Parsed section metadata within a prompt markdown file.
 */
export type PromptSection = {
    index: number;
    startLine: number;
    endLine: number;
    status: PromptStatus;
    priority: number;
    /**
     * Raw model or harness tokens required for this prompt, parsed from the backtick spans on the
     * status line (for example `['gpt-5.5']` for `[ ] use \`gpt-5.5\``).
     *
     * Empty when the prompt has no runner requirement. A token may name a concrete model, a harness,
     * or a whole family (for example `gpt`, `opus` or `github-copilot`) and is matched against the
     * running model and harness by normalized name in `isPromptInRunnerFilter`.
     */
    requiredModelOrHarnessTokens: string[];
    statusLineIndex?: number;
};
