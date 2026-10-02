import type { CodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { Usage } from '../../../src/execution/Usage';

/**
 * Outcome of one `ptbk coder ping` round trip through a harness and model.
 */
export type CoderPingResult = {
    /**
     * Human-readable name of the pinged harness, for example `OpenAI Codex`.
     */
    readonly runnerName: string;

    /**
     * Model the harness really used, when the harness works with an explicit model.
     */
    readonly modelName?: string;

    /**
     * Reasoning effort the harness was asked for, when one was selected.
     */
    readonly thinkingLevel?: ThinkingLevel;

    /**
     * Answer the harness gave to the dummy work, or `null` when it produced no recognizable answer.
     */
    readonly answer: string | null;

    /**
     * Whether the answer of the harness matches the expected result of the dummy work.
     */
    readonly isAnswerCorrect: boolean;

    /**
     * Wall-clock time the whole round trip took, in milliseconds.
     */
    readonly durationMs: number;

    /**
     * Resources the harness reported for the dummy work.
     */
    readonly usage: Usage;

    /**
     * Authentication method the harness used, when it can be determined.
     */
    readonly loginMethod?: CodexLoginMethod;
};
