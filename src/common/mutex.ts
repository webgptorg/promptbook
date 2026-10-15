/**
 * Minimal FIFO async mutex.
 *
 * @private shared concurrency helper
 */
export class Mutex {
    private tail: Promise<void> = Promise.resolve();

    /**
     * Runs an action exclusively; actions run in call order.
     */
    public async run<T>(action: () => Promise<T>): Promise<T> {
        const previous = this.tail;
        let release!: () => void;
        this.tail = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            return await action();
        } finally {
            release();
        }
    }
}
