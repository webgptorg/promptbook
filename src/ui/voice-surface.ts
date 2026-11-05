import { FeatureSurface, type FeatureSurfaceState } from './feature-server.js';
import { voiceFeaturePage } from './voice-page.js';

/**
 * The engine operations a voice media relay uses (the control channel of the running engine).
 *
 * @private voice media relay
 */
export type VoiceMediaChannel = {
    /** Delivers what the surface reported, in order (attachment, messages, recorded audio, detachment). */
    readonly media: (input: { readonly attach?: boolean; readonly detach?: boolean | string; readonly items?: readonly VoiceRelayItem[] }) => Promise<unknown>;
    /** Events for the surface after `after` (a bounded long poll). */
    readonly events: (after: number, signal: AbortSignal) => Promise<{ readonly events: ReadonlyArray<{ readonly seq: number; readonly event: Readonly<Record<string, unknown>> }>; readonly over: boolean }>;
};

/**
 * One item the relay forwards: a page message, or recorded audio of one side (base64 mono Int16LE PCM).
 *
 * @private voice media relay
 */
export type VoiceRelayItem = { readonly kind: 'message'; readonly message: Readonly<Record<string, unknown>> } | { readonly kind: 'audio'; readonly side: 'user' | 'agent'; readonly rate: number; readonly data: string };

/**
 * How often recorded audio is forwarded to the engine (the recording pipeline is not latency-sensitive).
 */
const AUDIO_FLUSH_MS = 250;

/**
 * The terminal presentation of a voice call's media: the call's own temporary feature server in this CLI process,
 * relaying the one authorized media page to the engine's call controller over the control channel. It works with the
 * project HTTP server disabled, and it closes (revoking the page and releasing the port) when the call ends or this
 * terminal leaves.
 *
 * @private voice media relay
 */
export class VoiceSurfaceRelay {
    private queue: VoiceRelayItem[] = [];
    private flushing = false;
    private pageRate = 24_000;
    private readonly abort = new AbortController();
    private flushTimer?: NodeJS.Timeout;
    private closed = false;

    private constructor(
        private readonly surface: FeatureSurface,
        private readonly channel: VoiceMediaChannel,
        private readonly onState: (state: FeatureSurfaceState, reason?: string) => void,
    ) {}

    /**
     * Starts the relay's temporary server for one call. `onState` reports waiting/attached/detached/expired/closed for
     * the terminal's status line.
     */
    public static async open(input: { readonly agent: string; readonly chat: string; readonly channel: VoiceMediaChannel; readonly onState: (state: FeatureSurfaceState, reason?: string) => void }): Promise<VoiceSurfaceRelay> {
        let relay: VoiceSurfaceRelay | undefined;
        const surface = await FeatureSurface.start({
            page: voiceFeaturePage({ agent: input.agent, chat: input.chat, hint: 'Controls are in your terminal. Closing this page ends the voice call; the chat and its work continue.' }),
            permissions: 'microphone=(self), camera=(), geolocation=()',
            // A reload of the same page may recover within the call's own grace; the engine ends the call after it.
            reattachMs: 8_000,
            maxMessageBytes: 512 * 1024,
            onMessage: (message) => relay?.message(message),
            onBinary: (data) => relay?.binary(data),
            onState: (state, detail) => relay?.state(state, detail),
        });
        relay = new VoiceSurfaceRelay(surface, input.channel, input.onState);
        void relay.pump();
        return relay;
    }

    /** The launch link of the page (this terminal only). */
    public get url(): string {
        return this.surface.url;
    }

    /** The surface state. */
    public get surfaceState(): FeatureSurfaceState {
        return this.surface.state;
    }

    /** Closes the page and the listener (the engine's call is ended separately by the chat's controls). */
    public async close(reason?: string): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        this.abort.abort();
        clearTimeout(this.flushTimer);
        await this.surface.close(reason);
    }

    /** Surface state changes: attachment and loss go to the call controller; an unused link ends the attempt. */
    private state(state: FeatureSurfaceState, detail: { readonly reason?: string; readonly recovered?: boolean }): void {
        if (state === 'attached') void this.channel.media({ attach: true }).catch(() => undefined);
        else if (state === 'detached') {
            this.enqueueFlush();
            void this.flush().then(() => this.channel.media({ detach: 'The voice page was closed.' })).catch(() => undefined);
        } else if (state === 'expired') void this.channel.media({ detach: 'The voice page was not opened in time.' }).catch(() => undefined);
        this.onState(state, detail.reason);
    }

    /** A page message: forwarded in order; the announced sample rate applies to the following audio. */
    private message(message: Readonly<Record<string, unknown>>): void {
        if (message.type === 'format' && typeof message.sampleRate === 'number' && message.sampleRate >= 8_000 && message.sampleRate <= 96_000) {
            this.pageRate = message.sampleRate;
            return;
        }
        this.queue.push({ kind: 'message', message });
        void this.flush();
    }

    /** Recorded audio: one tag byte (0 microphone, 1 the agent's received voice), then PCM. */
    private binary(data: Buffer): void {
        if (data.length < 3 || (data.length - 1) % 2 !== 0 || data[0]! > 1) return;
        const side = data[0] === 0 ? 'user' : 'agent';
        const last = this.queue[this.queue.length - 1];
        const pcm = data.subarray(1);
        // Consecutive audio of one side joins one item until the next flush.
        if (last?.kind === 'audio' && last.side === side && last.rate === this.pageRate) this.queue[this.queue.length - 1] = { ...last, data: Buffer.concat([Buffer.from(last.data, 'base64'), pcm]).toString('base64') };
        else this.queue.push({ kind: 'audio', side, rate: this.pageRate, data: pcm.toString('base64') });
        this.enqueueFlush();
    }

    /** Schedules the next audio flush. */
    private enqueueFlush(): void {
        if (this.flushTimer) return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            void this.flush();
        }, AUDIO_FLUSH_MS);
        this.flushTimer.unref();
    }

    /** Forwards the queued items in order, one batch at a time. */
    private async flush(): Promise<void> {
        if (this.flushing || !this.queue.length) return;
        this.flushing = true;
        try {
            while (this.queue.length) {
                const items = this.queue;
                this.queue = [];
                await this.channel.media({ items }).catch(() => undefined);
            }
        } finally {
            this.flushing = false;
        }
    }

    /** Delivers the call's events to the page until the call is over; its end closes the page and the listener. */
    private async pump(): Promise<void> {
        let after = 0;
        let failures = 0;
        while (!this.closed) {
            let batch: Awaited<ReturnType<VoiceMediaChannel['events']>>;
            try {
                batch = await this.channel.events(after, this.abort.signal);
                failures = 0;
            } catch {
                if (this.closed) return;
                // The engine (or the call) is gone: the page and the listener do not outlive it.
                if (++failures >= 5) return await this.close('The engine is no longer reachable, so the voice call ended.');
                await new Promise((resolve) => setTimeout(resolve, 1_000).unref());
                continue;
            }
            for (const item of batch.events) {
                after = Math.max(after, item.seq);
                if (item.event.type === 'ended') {
                    await this.close(typeof item.event.reason === 'string' ? item.event.reason : 'The voice call ended.');
                    return;
                }
                this.surface.send(item.event);
            }
            if (batch.over) {
                await this.close('The voice call ended.');
                return;
            }
        }
    }
}
