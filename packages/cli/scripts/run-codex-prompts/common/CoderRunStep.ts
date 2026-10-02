import type { Usage } from '../../../src/execution/Usage';

/**
 * Which kind of work one coder run step represents.
 *
 * - `implementation` — the first coding attempt for a prompt
 * - `testing` — one run of the configured verification command
 * - `fixing` — a follow-up coding attempt after a failed verification
 */
export type CoderRunStepKind = 'implementation' | 'testing' | 'fixing';

/**
 * One measured step within a single prompt round.
 *
 * A finished prompt is made of several steps (for example `implementation` → `testing` → `fixing` → `testing`)
 * and each one records its own price and duration so the completed prompt line can report usage step by step
 * instead of one lumped total.
 */
export type CoderRunStep = {
    /**
     * Which kind of work this step represents.
     */
    readonly kind: CoderRunStepKind;

    /**
     * Model usage recorded for this step, or `null` for steps that do not call the coding agent (for example `testing`).
     */
    readonly usage: Usage | null;

    /**
     * Wall-clock duration of this step in milliseconds.
     */
    readonly durationMs: number;
};
