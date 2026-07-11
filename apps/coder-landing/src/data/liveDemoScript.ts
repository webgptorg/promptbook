/**
 * One rendered frame of the live `ptbk coder run` terminal dashboard.
 */
export type LiveDemoFrame = {
    /**
     * Plain terminal lines rendered for this dashboard frame.
     */
    readonly lines: ReadonlyArray<string>;

    /**
     * How long this frame stays visible before the next snapshot, in milliseconds.
     */
    readonly delayMs: number;
};

/**
 * How long the live terminal rests after the frame sequence finishes before it loops again, in milliseconds.
 */
export const LIVE_DEMO_LOOP_PAUSE_MS = 4200;

/**
 * How long the live terminal waits between typing two characters of the command, in milliseconds.
 */
export const LIVE_DEMO_TYPING_INTERVAL_MS = 8;
