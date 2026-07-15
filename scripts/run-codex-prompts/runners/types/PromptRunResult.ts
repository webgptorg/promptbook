import type { Usage } from '../../../../src/execution/Usage';
import type { CodexLoginMethod } from '../openai-codex/codexLoginMethod';

/**
 * Result returned from running a prompt.
 */
export type PromptRunResult = {
    usage: Usage;

    /**
     * Which authentication method the runner used, when it can be determined.
     *
     * Currently only the OpenAI Codex runner reports this (its ChatGPT account vs. `OPENAI_API_KEY`);
     * other runners leave it `undefined`.
     */
    loginMethod?: CodexLoginMethod;
};
