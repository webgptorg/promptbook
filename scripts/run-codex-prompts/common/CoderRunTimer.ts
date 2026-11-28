import moment from 'moment';

/**
 * Tracks active coder-run time while excluding pauses and user-confirmation waits.
 */
export class CoderRunTimer {
    /**
     * Total milliseconds spent in paused state across the run.
     */
    private pausedMs = 0;

    /**
     * Timestamp when the timer was last paused, or `undefined` when active.
     */
    private pausedSince: moment.Moment | undefined;

    /**
     * Creates a timer anchored at the provided start time.
     */
    public constructor(
        private readonly startTime: moment.Moment,
        isPausedInitially = false,
    ) {
        if (isPausedInitially) {
            this.pausedSince = startTime.clone();
        }
    }

    /**
     * Pauses active-time tracking until `resume()` is called.
     */
    public pause(): void {
        if (this.pausedSince === undefined) {
            this.pausedSince = moment();
        }
    }

    /**
     * Resumes active-time tracking after a pause.
     */
    public resume(): void {
        if (this.pausedSince !== undefined) {
            this.pausedMs += moment().diff(this.pausedSince);
            this.pausedSince = undefined;
        }
    }

    /**
     * Returns the currently accumulated active duration.
     */
    public getElapsedDuration(): moment.Duration {
        const wallMs = moment().diff(this.startTime);
        const currentPauseMs = this.pausedSince !== undefined ? moment().diff(this.pausedSince) : 0;
        return moment.duration(Math.max(0, wallMs - this.pausedMs - currentPauseMs));
    }
}
