/**
 * Terminal control key of `ptbk coder run` which the user can press during a run.
 *
 * @private internal type of `ptbk coder` terminal controls
 */
export type CoderRunControlKey = 'P' | 'S' | 'X';

/**
 * Meaning of one control answer, which decides how it is colored in the terminal.
 *
 * @private internal type of `ptbk coder` terminal controls
 */
export type CoderRunControlFeedbackTone = 'success' | 'info' | 'warning';

/**
 * Answer of the runner to one pressed control key.
 *
 * Every single key press produces one of these, including presses which change nothing, so the user
 * always sees that the key was received.
 *
 * @private internal type of `ptbk coder` terminal controls
 */
export type CoderRunControlFeedback = {
    /**
     * Control key the answer belongs to.
     */
    readonly controlKey: CoderRunControlKey;

    /**
     * Human-readable description of what the key press did.
     */
    readonly message: string;

    /**
     * Meaning of the answer, used to color it.
     */
    readonly tone: CoderRunControlFeedbackTone;
};

/**
 * One control answer together with how many times the very same answer was repeated in a row.
 *
 * Pressing one control twice can produce the identical answer, so the repeat count is what makes the
 * second press change the rendered frame as well.
 *
 * @private internal type of `ptbk coder` terminal controls
 */
export type CoderRunControlFeedbackNotice = CoderRunControlFeedback & {
    /**
     * How many times this exact answer was given in a row, starting at `1`.
     */
    readonly repeatCount: number;
};

/**
 * How long one control answer stays visible in the rich terminal UI.
 *
 * @private internal constant of `ptbk coder` terminal controls
 */
export const CODER_RUN_CONTROL_FEEDBACK_DURATION_MS = 5_000;
