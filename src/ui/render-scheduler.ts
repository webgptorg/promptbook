/** Common bounded frame time for dashboard, nested views and terminal titles. @private terminal rendering */
export class RenderScheduler {
    private readonly started = performance.now();
    private readonly listeners = new Set<(time: number) => void>();
    private timer?: NodeJS.Timeout;

    /** Subscribes to one monotonic render budget; the final unsubscribe stops its only timer. */
    public subscribe(listener: (time: number) => void): () => void {
        this.listeners.add(listener);
        listener(performance.now() - this.started);
        this.timer ??= setInterval(() => {
            const time = performance.now() - this.started;
            for (const render of this.listeners) render(time);
        }, 350);
        this.timer.unref();
        return () => {
            this.listeners.delete(listener);
            if (!this.listeners.size) { clearInterval(this.timer); this.timer = undefined; }
        };
    }
}
