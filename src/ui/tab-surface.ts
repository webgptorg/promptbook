import type { TabControlView, TabFrame, TabInput } from '../browser/tab-control.js';
import { errorMessage } from '../common/errors.js';
import { FeatureSurface, type FeatureSurfaceState, type PresentedSurface, type SurfaceFactory } from './feature-server.js';
import { tabFeaturePage } from './tab-page.js';

/**
 * The engine's tab-control operations as the presenting client reaches them (the local control channel).
 *
 * @private tab viewer relay
 */
export type TabControlChannel = (method: string, params: Readonly<Record<string, unknown>>, signal?: AbortSignal) => Promise<unknown>;

/**
 * A frame waiting in the page's connection beyond this many bytes is dropped in favor of the next one.
 */
const MAX_BACKLOG_BYTES = 1_500_000;

/**
 * How long one frame poll waits in the engine.
 */
const POLL_WAIT_MS = 15_000;

/**
 * Whether a tab-control state is over (returned, ended or lost).
 */
function over(view: TabControlView): boolean {
    return view.state === 'returned' || view.state === 'ended' || view.state === 'lost';
}

/**
 * The terminal presentation of one user-controlled tab: its own temporary feature server in this CLI process serves
 * the viewer page and relays it to the engine's tab control over the control channel (frames by long poll, inputs as
 * ordered batches). Closing the page or this terminal detaches the viewer without handing the tab back; the tab's end
 * (handoff, end of use, loss) closes the page and releases the port.
 *
 * @private tab viewer relay
 */
export class TabSurfaceRelay {
    private readonly abort = new AbortController();
    /** Operations of the page in their order: input batches and other calls (attach, navigation, size, clipboard). */
    private queue: Array<{ readonly kind: 'input'; readonly events: TabInput[] } | { readonly kind: 'call'; readonly run: () => Promise<void> }> = [];
    private sending = false;
    private closed = false;
    private lastView?: string;
    private viewValue: TabControlView;

    private constructor(
        private readonly surface: PresentedSurface,
        private readonly id: string,
        private readonly grant: string,
        private readonly channel: TabControlChannel,
        initial: TabControlView,
        private readonly onState: (state: FeatureSurfaceState, reason?: string) => void,
        private readonly onView: (view: TabControlView) => void,
    ) {
        this.viewValue = initial;
    }

    /** Starts the viewer's temporary server for one tab control (the grant was claimed by this client). */
    public static async open(input: {
        readonly control: TabControlView;
        readonly grant: string;
        readonly channel: TabControlChannel;
        readonly hint?: string;
        readonly onState: (state: FeatureSurfaceState, reason?: string) => void;
        readonly onView?: (view: TabControlView) => void;
        /** Where the viewer is presented: the terminal's temporary server by default, or the desktop app's view. */
        readonly surface?: SurfaceFactory;
    }): Promise<TabSurfaceRelay> {
        let relay: TabSurfaceRelay | undefined;
        const surface = await (input.surface ?? FeatureSurface.start)({
            page: tabFeaturePage({ browser: input.control.browser, hint: input.hint ?? 'Return control to the agent (and any Wallet choice) from your terminal. Closing this page keeps the tab with you.' }),
            permissions: 'clipboard-read=(self), clipboard-write=(self), microphone=(), camera=(), geolocation=()',
            // A reload of the same viewer tab recovers within this window; later, reopen control from the terminal.
            reattachMs: 30_000,
            maxMessageBytes: 256 * 1024,
            onMessage: (message) => relay?.message(message),
            onState: (state, detail) => relay?.state(state, detail),
        });
        relay = new TabSurfaceRelay(surface, input.control.id, input.grant, input.channel, input.control, input.onState, input.onView ?? (() => undefined));
        void relay.pump();
        return relay;
    }

    /** The launch link of the viewer (this terminal only). */
    public get url(): string {
        return this.surface.url;
    }

    /** The surface state. */
    public get surfaceState(): FeatureSurfaceState {
        return this.surface.state;
    }

    /** The latest view of the controlled tab. */
    public get view(): TabControlView {
        return this.viewValue;
    }

    /** A fresh invitation after an unused one expired (explicit retry). */
    public retry(): void {
        this.surface.retry();
    }

    /** Closes the viewer and its listener; the tab stays with the user unless it was handed back (no handoff here). */
    public async close(reason?: string): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        this.abort.abort();
        this.queue = [];
        if (!over(this.viewValue)) await this.call('tab-control-detach', {}).catch(() => undefined);
        await this.surface.close(reason);
    }

    /** One engine call with this viewer's grant. */
    private async call(method: string, params: Readonly<Record<string, unknown>>, signal?: AbortSignal): Promise<unknown> {
        return await this.channel(method, { id: this.id, grant: this.grant, ...params }, signal);
    }

    /** Surface state changes: attachment starts the stream; loss detaches the viewer (never a handoff). */
    private state(state: FeatureSurfaceState, detail: { readonly reason?: string; readonly recovered?: boolean }): void {
        if (state === 'attached') {
            // Attachment goes first in the ordered queue, so the page's first inputs reach a connected viewer.
            this.enqueue(async () => this.publish(((await this.call('tab-control-attach', {})) as { control: TabControlView }).control, true));
        } else if (state === 'detached' || state === 'expired') {
            // Inputs not delivered yet are dropped (never replayed later); the viewer detaches without a handoff.
            this.queue = [];
            void this.call('tab-control-detach', {}).catch(() => undefined);
        }
        this.onState(state, detail.reason);
    }

    /** A page message: inputs, toolbar navigation, viewport size and explicit clipboard copies, all in their order. */
    private message(message: Readonly<Record<string, unknown>>): void {
        if (this.closed) return;
        switch (message.type) {
            case 'input':
                if (Array.isArray(message.events)) {
                    const events = (message.events as TabInput[]).slice(0, 400);
                    const last = this.queue[this.queue.length - 1];
                    // Consecutive inputs travel as one batch.
                    if (last && last.kind === 'input' && last.events.length + events.length <= 400) last.events.push(...events);
                    else this.queue.push({ kind: 'input', events: [...events] });
                    void this.drain();
                }
                break;
            case 'navigate':
                this.enqueue(async () => this.publish(((await this.call('tab-control-navigate', { action: String(message.action ?? ''), ...(typeof message.url === 'string' ? { url: message.url } : {}) })) as { control: TabControlView }).control));
                break;
            case 'resize':
                this.enqueue(async () => void (await this.call('tab-control-resize', { width: Number(message.width), height: Number(message.height), scale: Number(message.scale) })));
                break;
            case 'clipboard': {
                const action = message.action === 'cut' ? 'cut' : 'copy';
                // The copied text goes only to this viewer, which writes it to the user's clipboard.
                this.enqueue(async () => this.surface.send({ type: 'clipboard', text: String(((await this.call('tab-control-clipboard', { action })) as { text?: string }).text ?? '') }));
                break;
            }
        }
    }

    /** Adds one operation to the ordered queue. */
    private enqueue(run: () => Promise<void>): void {
        this.queue.push({ kind: 'call', run });
        void this.drain();
    }

    /** Delivers the queued operations to the engine strictly in order, one at a time. */
    private async drain(): Promise<void> {
        if (this.sending) return;
        this.sending = true;
        try {
            while (this.queue.length && !this.closed) {
                const next = this.queue.shift()!;
                try {
                    if (next.kind === 'input') await this.call('tab-control-input', { events: next.events });
                    else await next.run();
                } catch (error) {
                    if (next.kind === 'call') this.surface.send({ type: 'problem', text: errorMessage(error) });
                }
            }
        } finally {
            this.sending = false;
        }
    }

    /** Publishes the view to the page and the presenter when it changed. */
    private publish(view: TabControlView, force = false): void {
        this.viewValue = view;
        const serialized = JSON.stringify(view);
        if (!force && serialized === this.lastView) return;
        this.lastView = serialized;
        this.surface.send({ type: 'view', view });
        this.onView(view);
    }

    /** Streams frames and state until the control is over (its end closes the page and the listener). */
    private async pump(): Promise<void> {
        let version = 0;
        let frame = 0;
        let failures = 0;
        while (!this.closed) {
            let result: { readonly version: number; readonly view: TabControlView; readonly frame?: TabFrame };
            try {
                result = (await this.call('tab-control-poll', { version, frame, wait: POLL_WAIT_MS }, this.abort.signal)) as typeof result;
                failures = 0;
            } catch (error) {
                if (this.closed) return;
                // Control was reopened elsewhere with fresh access: this viewer is replaced, the tab stays with the user.
                if (/no longer authorized/.test(errorMessage(error))) return await this.close('This viewer was replaced: control of the tab was opened again elsewhere.');
                if (++failures >= 5) return await this.close(`The engine is no longer reachable (${errorMessage(error)}); the tab stays protected until you open control again.`);
                await new Promise((resolve) => setTimeout(resolve, 1_000).unref());
                continue;
            }
            version = result.version;
            this.publish(result.view);
            if (result.frame) {
                frame = result.frame.seq;
                // Under backpressure the stale frame is dropped; the next poll brings the newest one.
                if (this.surface.attached && this.surface.backlog < MAX_BACKLOG_BYTES) {
                    this.surface.send({ type: 'frame', width: result.frame.width, height: result.frame.height });
                    this.surface.sendBinary(Buffer.from(result.frame.data, 'base64'));
                }
            }
            if (over(result.view)) {
                await this.close(result.view.outcome ?? result.view.problem ?? 'Control of this tab ended.');
                return;
            }
        }
    }
}
