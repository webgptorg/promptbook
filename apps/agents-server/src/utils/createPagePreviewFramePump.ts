/**
 * Options of one page-preview frame pump.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type PagePreviewFramePumpOptions = {
    /**
     * Minimum milliseconds between two written frames (caps the stream frame rate).
     */
    readonly minimumFrameIntervalMs: number;

    /**
     * Milliseconds of inactivity after which the latest frame is re-sent to keep the
     * multipart connection alive across proxies.
     */
    readonly heartbeatIntervalMs: number;

    /**
     * Writes one JPEG frame into the multipart stream.
     */
    readonly writeFrame: (frame: Buffer) => void;
};

/**
 * Pacing gate between a push-based frame source (CDP screencast) and the multipart stream.
 *
 * @private internal type of Agents Server page-preview streaming
 */
export type PagePreviewFramePump = {
    /**
     * Offers one fresh frame; it is written immediately, or replaces the pending frame
     * when the stream is already at its frame-rate cap.
     */
    readonly pushFrame: (frame: Buffer) => void;

    /**
     * Stops the pump, its scheduled writes, and its heartbeat.
     */
    readonly stop: () => void;
};

/**
 * Creates a pacing gate that caps the stream frame rate and keeps idle streams alive.
 *
 * A push-based source (CDP screencast) can deliver frames faster than the preview needs;
 * excess frames are dropped in favor of the latest one. When the source goes quiet
 * (static page), the latest frame is re-sent as a heartbeat.
 *
 * @param options - Pump options.
 * @returns Running frame pump.
 *
 * @private internal utility of Agents Server page-preview streaming
 */
export function createPagePreviewFramePump(options: PagePreviewFramePumpOptions): PagePreviewFramePump {
    let latestWrittenFrame: Buffer | null = null;
    let pendingFrame: Buffer | null = null;
    let lastWriteAtMs = 0;
    let scheduledWriteTimeout: NodeJS.Timeout | null = null;
    let isStopped = false;

    const writeFrameNow = (frame: Buffer): void => {
        latestWrittenFrame = frame;
        lastWriteAtMs = Date.now();
        options.writeFrame(frame);
    };

    const pushFrame = (frame: Buffer): void => {
        if (isStopped) {
            return;
        }

        const elapsedMs = Date.now() - lastWriteAtMs;
        if (elapsedMs >= options.minimumFrameIntervalMs) {
            writeFrameNow(frame);
            return;
        }

        pendingFrame = frame;
        if (scheduledWriteTimeout === null) {
            scheduledWriteTimeout = setTimeout(() => {
                scheduledWriteTimeout = null;
                if (isStopped || pendingFrame === null) {
                    return;
                }

                const frameToWrite = pendingFrame;
                pendingFrame = null;
                writeFrameNow(frameToWrite);
            }, Math.max(1, options.minimumFrameIntervalMs - elapsedMs));
        }
    };

    const heartbeatInterval = setInterval(() => {
        if (isStopped || latestWrittenFrame === null) {
            return;
        }

        if (Date.now() - lastWriteAtMs >= options.heartbeatIntervalMs) {
            writeFrameNow(latestWrittenFrame);
        }
    }, options.heartbeatIntervalMs);
    heartbeatInterval.unref?.();

    const stop = (): void => {
        isStopped = true;
        if (scheduledWriteTimeout !== null) {
            clearTimeout(scheduledWriteTimeout);
            scheduledWriteTimeout = null;
        }

        clearInterval(heartbeatInterval);
        latestWrittenFrame = null;
        pendingFrame = null;
    };

    return { pushFrame, stop };
}
