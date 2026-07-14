import type { PagePreviewInputEvent } from './PagePreviewInputEvent';
import type { PagePreviewSessionState } from './PagePreviewSessionState';

/**
 * Default endpoint receiving live page-preview input events.
 *
 * @private constant of `PagePreviewInputQueue`
 */
const PAGE_PREVIEW_INPUT_ENDPOINT_URL = '/api/page-preview/input';

/**
 * Options of one `PagePreviewInputQueue`.
 *
 * @private type of `PagePreviewInputQueue`
 */
export type PagePreviewInputQueueOptions = {
    /**
     * Page-preview browser session id the events belong to.
     */
    readonly sessionId: string;

    /**
     * Endpoint receiving the input events, defaults to `/api/page-preview/input`.
     */
    readonly endpointUrl?: string;

    /**
     * Called with the fresh session navigation state returned by the server after each delivered event.
     */
    readonly onSessionState?: (state: PagePreviewSessionState) => void;
};

/**
 * Delivers remote-control events of one live page-preview browser session to the Agents Server.
 *
 * Events are sent strictly one after another so the remote browser receives them in order
 * (crucial for drags and text selection). While one request is in flight, bursty events are
 * coalesced: consecutive `move` events collapse into the latest one, consecutive `wheel`
 * events accumulate their deltas, and only the latest `resize` is kept.
 *
 * @private utility of `<LiveBrowserPreview/>`
 */
export class PagePreviewInputQueue {
    private readonly pendingEvents: Array<PagePreviewInputEvent> = [];
    private isFlushing = false;
    private isDisposed = false;

    public constructor(private readonly options: PagePreviewInputQueueOptions) {}

    /**
     * Enqueues one input event for ordered delivery.
     *
     * @param inputEvent - Event to forward to the remote browser.
     */
    public send(inputEvent: PagePreviewInputEvent): void {
        if (this.isDisposed) {
            return;
        }

        this.coalesceIntoPendingEvents(inputEvent);
        void this.flushPendingEvents();
    }

    /**
     * Stops the queue and drops all undelivered events.
     */
    public dispose(): void {
        this.isDisposed = true;
        this.pendingEvents.length = 0;
    }

    /**
     * Adds one event to the queue, merging it with the trailing event when possible.
     *
     * @param inputEvent - Event to enqueue.
     */
    private coalesceIntoPendingEvents(inputEvent: PagePreviewInputEvent): void {
        const lastEventIndex = this.pendingEvents.length - 1;
        const lastEvent = this.pendingEvents[lastEventIndex];

        if (inputEvent.type === 'move' && lastEvent?.type === 'move') {
            this.pendingEvents[lastEventIndex] = inputEvent;
            return;
        }

        if (inputEvent.type === 'wheel' && lastEvent?.type === 'wheel') {
            this.pendingEvents[lastEventIndex] = {
                ...inputEvent,
                deltaX: lastEvent.deltaX + inputEvent.deltaX,
                deltaY: lastEvent.deltaY + inputEvent.deltaY,
            };
            return;
        }

        if (inputEvent.type === 'resize') {
            for (let index = this.pendingEvents.length - 1; index >= 0; index--) {
                if (this.pendingEvents[index]!.type === 'resize') {
                    this.pendingEvents.splice(index, 1);
                }
            }
        }

        this.pendingEvents.push(inputEvent);
    }

    /**
     * Delivers pending events one by one until the queue is drained.
     */
    private async flushPendingEvents(): Promise<void> {
        if (this.isFlushing) {
            return;
        }

        this.isFlushing = true;
        try {
            while (this.pendingEvents.length > 0 && !this.isDisposed) {
                const inputEvent = this.pendingEvents.shift()!;
                await this.deliverInputEvent(inputEvent);
            }
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Sends one event to the server, surfacing the returned session state.
     *
     * @param inputEvent - Event to deliver.
     */
    private async deliverInputEvent(inputEvent: PagePreviewInputEvent): Promise<void> {
        try {
            const response = await fetch(this.options.endpointUrl ?? PAGE_PREVIEW_INPUT_ENDPOINT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: this.options.sessionId, ...inputEvent }),
                keepalive: true,
            });

            const data = (await response.json().catch(() => null)) as { state?: PagePreviewSessionState } | null;
            if (data?.state && typeof data.state.url === 'string') {
                this.options.onSessionState?.(data.state);
            }
        } catch {
            // Input is best-effort — one dropped event must not break the live preview
        }
    }
}
