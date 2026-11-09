import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { VoiceEvent, VoiceSession } from '../harness/voice.js';
import type { MessageAudioStatus } from './message-audio.js';
import type { MessageAudioInput } from './store.js';

/**
 * Observed state of a voice call, from actual events only (never Listening without delivered microphone audio).
 *
 * @private voice calls
 */
export type VoiceCallState = 'connecting' | 'awaiting-browser' | 'listening' | 'speaking' | 'reconnecting' | 'ending' | 'ended' | 'failed';

/**
 * A voice call as every client sees it (the media grant is given only to the controlling client).
 *
 * @private voice calls
 */
export type VoiceCallView = {
    /** Technical call correlation (not a Book identifier). */
    readonly id: string;
    /** The owning chat. */
    readonly chat: string;
    /** The speaking agent. */
    readonly agent: string;
    /** Harness and registered instance serving the call. */
    readonly harness: string;
    readonly tool?: string;
    /** Call state. */
    readonly state: VoiceCallState;
    /** Microphone delivery muted in the terminal (the provider connection stays open). */
    readonly micMuted: boolean;
    /** Spoken output muted (playback silenced; the provider keeps speaking and recording continues). */
    readonly outputMuted: boolean;
    /** The media surface: not opened yet, owning the media, or gone (the call ends unless it returns). */
    readonly page: 'waiting' | 'connected' | 'detached';
    /** Browser microphone and playback state reported by the page. */
    readonly mic?: 'live' | 'denied' | 'missing' | 'unavailable';
    readonly playback?: 'ok' | 'blocked';
    /** Provisional captions (never accepted messages). */
    readonly captions: { readonly user?: string; readonly assistant?: string };
    /** Utterances accepted into the chat during this call. */
    readonly accepted: number;
    /** Which path accepted the utterances (`native`: the voice session's backing agent; no text reply runs again). */
    readonly dispatch: 'native' | 'engine';
    /** Start and end (ISO). */
    readonly startedAt: string;
    readonly endedAt?: string;
    /** The latest problem in the operator's words. */
    readonly problem?: string;
    /** Recording problems (incomplete archive). */
    readonly archive: readonly string[];
    /**
     * Messages this call saved from speech (1-based positions, in order) and the state of their recording: still
     * `finalizing`, `saved` (bound as CHAT MESSAGE AUDIO) or `unavailable` (nothing could be bound). Clients mark these
     * messages as spoken before the durable audio binding exists.
     */
    readonly spoken?: ReadonlyArray<{ readonly message: number; readonly recording: VoiceRecordingState }>;
};

/**
 * Recording state of one spoken message during its call.
 *
 * @private voice calls
 */
export type VoiceRecordingState = 'finalizing' | 'saved' | 'unavailable';

/**
 * How many spoken messages a call view lists (the latest ones).
 */
const SPOKEN_VIEW_LIMIT = 200;

/**
 * What a call needs from its engine: ordinary chat persistence and change notification.
 *
 * @private voice calls
 */
export type VoiceCallHost = {
    /**
     * Starts (or, after a page reload, restarts) the provider session for the media page's WebRTC offer: readiness is
     * revalidated and the chat's context and tools are prepared again; a typed failure otherwise.
     */
    readonly connect: (offer: string, onEvent: (event: VoiceEvent) => void) => Promise<VoiceSession>;
    /** Appends one finalized utterance as an ordinary attributed chat message; returns its 1-based position. */
    readonly append: (chat: string, role: 'user' | 'assistant', text: string, call: string) => Promise<number>;
    /** Binds finalized recordings to their message through the chat-asset pipeline. */
    readonly record: (chat: string, message: number, segments: readonly MessageAudioInput[]) => Promise<{ readonly problems: readonly string[] }>;
    /** Keeps a recording that has no transcript (never bound to invented words); returns where it is. */
    readonly keepUntranscribed: (chat: string, segment: MessageAudioInput) => Promise<string | undefined>;
    /** The call changed (clients refresh). */
    readonly onChange: () => void;
    /** Activity log. */
    readonly log: (text: string) => void;
};

/**
 * How long the media page may be gone (reload, network hiccup) before the call ends.
 */
const PAGE_GRACE_MS = 8_000;

/**
 * How long a call lives without its controlling terminal's heartbeat.
 *
 * @private voice calls
 */
export const VOICE_LEASE_MS = 15_000;

/**
 * Longest recording segment: a long utterance is split instead of one growing whole-call file.
 */
const MAX_SEGMENT_MS = 120_000;

/**
 * Longest wait for the end of a spoken reply's playback before its recording is bound anyway.
 */
const REPLY_AUDIO_MS = 30_000;

/**
 * Microphone level that counts as speech for the recording gate.
 */
const SPEECH_RMS = 0.02;

/**
 * Microphone audio kept before detected speech, so an utterance's start is not cut.
 */
const PRE_ROLL_MS = 400;

/**
 * Wraps mono Int16LE PCM in a WAV container.
 *
 * @private voice calls
 */
export function wav(pcm: Buffer, sampleRate: number): Buffer {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
}

/**
 * Root-mean-square level of Int16LE PCM (0–1).
 */
function rms(pcm: Buffer): number {
    const samples = Math.floor(pcm.length / 2);
    if (!samples) return 0;
    let sum = 0;
    for (let index = 0; index < samples; index++) {
        const value = pcm.readInt16LE(index * 2) / 0x8000;
        sum += value * value;
    }
    return Math.sqrt(sum / samples);
}

/**
 * Audio of one side being collected for the next utterance (bounded parts).
 */
class Recording {
    private chunks: Buffer[] = [];
    private bytes = 0;
    private startMs?: number;
    private preRoll: Array<{ readonly pcm: Buffer; readonly atMs: number }> = [];
    /** Finalized parts of a long utterance, awaiting their transcript. */
    public parts: MessageAudioInput[] = [];
    public interrupted = false;
    private sequence = 0;

    public constructor(
        private readonly call: string,
        private readonly side: 'user' | 'agent',
        private readonly gated: boolean,
    ) {}

    /** Whether any audio is held. */
    public get empty(): boolean {
        return !this.chunks.length && !this.parts.length;
    }

    /** Adds audio observed at a call offset. */
    public add(pcm: Buffer, sampleRate: number, atMs: number): void {
        this.rate = sampleRate;
        if (this.gated && !this.chunks.length) {
            // Silence before speech is not recorded; a short pre-roll keeps the utterance's start.
            this.preRoll.push({ pcm, atMs });
            while (this.preRoll.length && atMs - this.preRoll[0]!.atMs > PRE_ROLL_MS) this.preRoll.shift();
            if (rms(pcm) < SPEECH_RMS) return;
            for (const item of this.preRoll) this.push(item.pcm, item.atMs);
            this.preRoll = [];
            return;
        }
        this.push(pcm, atMs);
    }

    private rate = 24_000;

    private push(pcm: Buffer, atMs: number): void {
        if (this.startMs === undefined) this.startMs = atMs;
        this.chunks.push(pcm);
        this.bytes += pcm.length;
        if ((this.bytes / 2 / this.rate) * 1000 >= MAX_SEGMENT_MS) this.cut('complete');
    }

    /** Closes the current chunk run into a finalized part. */
    private cut(status: MessageAudioStatus): void {
        if (!this.chunks.length || this.startMs === undefined) return;
        const pcm = Buffer.concat(this.chunks);
        const endMs = this.startMs + Math.round((pcm.length / 2 / this.rate) * 1000);
        this.parts.push({ id: `${this.call}-${this.side}-${Date.now().toString(36)}-${++this.sequence}`, extension: 'wav', data: wav(pcm, this.rate), status, timing: { call: this.call, startMs: this.startMs, endMs } });
        this.chunks = [];
        this.bytes = 0;
        this.startMs = undefined;
    }

    /** Takes every finalized part of the utterance (the last one with its status). */
    public take(status: MessageAudioStatus): MessageAudioInput[] {
        this.cut(status === 'complete' && this.interrupted ? 'interrupted' : status);
        const parts = this.parts;
        this.parts = [];
        this.interrupted = false;
        this.preRoll = [];
        return parts;
    }
}

/**
 * One live voice call in an existing chat: the call controller shared by every presentation, its one authorized media
 * owner (the terminal's temporary media page or the desktop chat's embedded surface), the provider voice session and
 * the transcript and recording pipeline into the same Chat Book. Ending (explicitly, by closure or loss of the media
 * surface, a lost controlling-client lease, provider loss or engine Stop) releases the microphone, playback, provider
 * session and surface in bounded time and never ends the chat or its independent work.
 *
 * @private voice calls
 */
export class VoiceCall {
    public readonly id = `call-${randomBytes(4).toString('hex')}`;
    /** A new call waits for its media page (its offer starts the provider session). */
    private state: VoiceCallState = 'awaiting-browser';
    private micMuted = false;
    private outputMuted = false;
    private page: VoiceCallView['page'] = 'waiting';
    private mic?: VoiceCallView['mic'];
    private playback?: VoiceCallView['playback'];
    private captions: { user?: string; assistant?: string } = {};
    private accepted = 0;
    private problem?: string;
    private readonly archive: string[] = [];
    private readonly started = Date.now();
    private endedAt?: string;
    private session?: VoiceSession;
    private pageTimer?: NodeJS.Timeout;
    private leaseTimer?: NodeJS.Timeout;
    private leaseUntil: number;
    private readonly user: Recording;
    private readonly agentAudio: Recording;
    /** The spoken reply whose transcript is saved and whose audio still plays. */
    private pendingReply?: number;
    /** Serializes persistence in utterance order. */
    private queue: Promise<void> = Promise.resolve();
    private usage?: Readonly<Record<string, number>>;
    private ending?: Promise<void>;
    /** Messages this call appended (positions), so later context delivery skips them. */
    public readonly own = new Set<number>();
    /** Recording state of each message this call saved from speech, by position. */
    private readonly recordings = new Map<number, VoiceRecordingState>();

    public constructor(
        public readonly chat: string,
        public readonly agent: string,
        public readonly harness: string,
        public readonly tool: string | undefined,
        private readonly host: VoiceCallHost,
        private readonly timing: { readonly pageGraceMs: number; readonly leaseMs: number } = { pageGraceMs: PAGE_GRACE_MS, leaseMs: VOICE_LEASE_MS },
    ) {
        this.leaseUntil = Date.now() + timing.leaseMs;
        this.user = new Recording(this.id, 'user', true);
        // The received track carries silence between replies: both sides record speech only (with a short pre-roll).
        this.agentAudio = new Recording(this.id, 'agent', true);
    }

    /** Milliseconds since the call started. */
    private offset(): number {
        return Date.now() - this.started;
    }

    /**
     * Opens the call for its one media owner (the controlling client's surface) and starts the controlling client's
     * lease. Returns the scoped media grant, which only that client receives.
     */
    public open(controller?: string): string {
        this.controller = controller;
        this.leaseTimer = setInterval(() => {
            if (Date.now() > this.leaseUntil) void this.end('The controlling terminal or window is gone.');
        }, Math.min(2_000, this.timing.leaseMs / 3));
        this.leaseTimer.unref();
        return this.grant;
    }

    /** The scoped media grant of this call's one media owner. */
    public readonly grant = randomBytes(18).toString('base64url');

    /** The client that started the call and owns its media surface. */
    public controller?: string;

    /** Whether a presented grant is this call's (constant time). */
    public authorized(grant: string): boolean {
        const left = Buffer.from(grant);
        const right = Buffer.from(this.grant);
        return left.length === right.length && timingSafeEqual(left, right);
    }

    /** Events queued for the media surface (bounded; the surface fetches them in order). */
    private readonly outbox: Array<{ readonly seq: number; readonly event: Readonly<Record<string, unknown>> }> = [];
    private outboxSeq = 0;
    private readonly outboxWaiters = new Set<() => void>();

    /** Queues an event for the media surface. */
    private send(event: Readonly<Record<string, unknown>>): void {
        this.outbox.push({ seq: ++this.outboxSeq, event });
        // Captions and states are superseded quickly; a stalled surface never grows the queue without bound.
        if (this.outbox.length > 400) this.outbox.splice(0, this.outbox.length - 400);
        for (const wake of [...this.outboxWaiters]) wake();
    }

    /**
     * Events for the media surface after `after`, waiting (bounded) for the next one. `over` once the call ended and
     * every event was delivered.
     */
    public async mediaEvents(after: number, waitMs: number): Promise<{ readonly events: ReadonlyArray<{ readonly seq: number; readonly event: Readonly<Record<string, unknown>> }>; readonly over: boolean }> {
        const pending = (): typeof this.outbox => this.outbox.filter((item) => item.seq > after);
        if (!pending().length && !this.over && waitMs > 0) {
            await new Promise<void>((resolve) => {
                const timer = setTimeout(done, waitMs);
                function done(): void {
                    clearTimeout(timer);
                    waiters.delete(done);
                    resolve();
                }
                const waiters = this.outboxWaiters;
                waiters.add(done);
            });
        }
        return { events: pending(), over: this.over };
    }

    /** The media surface attached (first open, a reconnect or a reload of the same owner). */
    public mediaAttached(): void {
        if (this.over) return;
        clearTimeout(this.pageTimer);
        this.page = 'connected';
        if (this.state === 'reconnecting') this.state = this.mic === 'live' ? 'listening' : 'awaiting-browser';
        this.changed();
    }

    /** The media surface went away: the call ends unless it returns within the grace. */
    public mediaDetached(reason = 'The voice page was closed.'): void {
        if (this.over || this.state === 'ending') return;
        this.page = 'detached';
        this.mic = undefined;
        this.state = 'reconnecting';
        this.changed();
        clearTimeout(this.pageTimer);
        this.pageTimer = setTimeout(() => void this.end(reason), this.timing.pageGraceMs);
        this.pageTimer.unref();
    }

    /** One message of the media surface (device and playback state, the WebRTC offer, barge-in, playback idle). */
    public mediaMessage(message: Readonly<Record<string, unknown>>): void {
        if (this.over) return;
        this.pageMessage(message);
    }

    /** Recorded PCM of the media surface (mono Int16LE): the delivered microphone or the agent's received voice. */
    public mediaAudio(side: 'user' | 'agent', pcm: Buffer, sampleRate: number): void {
        if (sampleRate < 8_000 || sampleRate > 96_000 || pcm.length < 2 || pcm.length % 2 !== 0) return;
        this.audio(side, pcm, sampleRate);
    }

    /** Whether the provider session is connected (its answer was given to the page). */
    public get connected(): boolean {
        return Boolean(this.session);
    }

    /**
     * Negotiates the provider session for the page's offer. A reload's new offer replaces the previous session of this
     * same call (one input owner, never a second call); a refusal ends the call with the provider's reason.
     */
    private async negotiate(offer: string): Promise<void> {
        if (this.over || this.state === 'ending' || this.negotiating) return;
        this.negotiating = true;
        this.state = 'connecting';
        this.changed();
        try {
            const previous = this.session;
            this.session = undefined;
            await previous?.end().catch(() => undefined);
            const session = await this.host.connect(offer, (event) => this.event(event));
            // Ending may have started while the provider negotiated.
            if (this.over || (this.state as VoiceCallState) === 'ending') {
                await session.end().catch(() => undefined);
                return;
            }
            this.session = session;
            this.send({ type: 'answer', sdp: session.answer });
            this.state = this.mic === 'live' ? 'listening' : 'awaiting-browser';
            this.changed();
        } catch (error) {
            await this.end(error instanceof Error ? error.message : String(error), true);
        } finally {
            this.negotiating = false;
        }
    }

    /** A negotiation in progress. */
    private negotiating = false;

    /** Safety bound of a reply's audio. */
    private replyTimer?: NodeJS.Timeout;

    /** Renews the controlling terminal's lease. */
    public heartbeat(): void {
        this.leaseUntil = Date.now() + this.timing.leaseMs;
    }

    /** Whether the call is over. */
    public get over(): boolean {
        return this.state === 'ended' || this.state === 'failed';
    }

    /** The shared view. */
    public view(): VoiceCallView {
        return {
            id: this.id,
            chat: this.chat,
            agent: this.agent,
            harness: this.harness,
            ...(this.tool ? { tool: this.tool } : {}),
            state: this.state,
            micMuted: this.micMuted,
            outputMuted: this.outputMuted,
            page: this.page,
            ...(this.mic ? { mic: this.mic } : {}),
            ...(this.playback ? { playback: this.playback } : {}),
            captions: { ...this.captions },
            accepted: this.accepted,
            dispatch: this.session?.dispatch ?? 'native',
            startedAt: new Date(this.started).toISOString(),
            ...(this.endedAt ? { endedAt: this.endedAt } : {}),
            ...(this.problem ? { problem: this.problem } : {}),
            archive: [...this.archive],
            ...(this.recordings.size ? { spoken: [...this.recordings].slice(-SPOKEN_VIEW_LIMIT).map(([message, recording]) => ({ message, recording })) } : {}),
        };
    }

    /** Applies a terminal control. */
    public control(action: 'mute-mic' | 'unmute-mic' | 'mute-output' | 'unmute-output'): void {
        if (action === 'mute-mic' || action === 'unmute-mic') this.micMuted = action === 'mute-mic';
        else this.outputMuted = action === 'mute-output';
        this.changed();
    }

    /** Supplies a later chat message or backend outcome to the voice session as context. */
    public async supply(text: string): Promise<void> {
        await this.session?.supplyContext(text).catch((error: Error) => this.host.log(`Voice context in {${this.chat}} was not delivered: ${error.message}`));
    }

    /** Handles one provider event. */
    public event(event: VoiceEvent): void {
        if (this.over) return;
        switch (event.type) {
            case 'started':
                break;
            case 'caption':
                if (event.role === 'user') {
                    // The user speaking over spoken output: playback stops at once; delegated work is untouched.
                    if (this.state === 'speaking') this.bargeIn();
                    this.captions.user = `${this.captions.user ?? ''}${event.delta}`;
                } else {
                    if (this.pendingReply !== undefined) this.finishReply('complete');
                    this.captions.assistant = `${this.captions.assistant ?? ''}${event.delta}`;
                    this.state = 'speaking';
                }
                this.send({ type: 'caption', role: event.role, text: event.role === 'user' ? this.captions.user : this.captions.assistant });
                this.changed();
                break;
            case 'transcript':
                this.transcript(event.role, event.text);
                break;
            case 'usage':
                this.usage = event.usage;
                break;
            case 'error':
                this.problem = event.text;
                this.host.log(`Voice in {${this.chat}}: ${event.text}`);
                this.changed();
                break;
            case 'closed':
                void this.end(event.reason ? `The voice session closed: ${event.reason}` : 'The voice session closed.', event.outcome === 'failed');
                break;
        }
    }

    /** Persists one finalized utterance in order, with its recording. */
    private transcript(role: 'user' | 'assistant', text: string): void {
        const clean = text.trim();
        if (role === 'user') this.captions.user = undefined;
        else this.captions.assistant = undefined;
        this.send({ type: 'final', role, text: clean });
        if (!clean) return this.changed();
        const userAudio = role === 'user' ? this.user.take('complete') : [];
        this.queue = this.queue.then(async () => {
            try {
                const position = await this.host.append(this.chat, role, clean, this.id);
                this.own.add(position);
                this.recordings.set(position, 'finalizing');
                this.accepted++;
                if (role === 'user') await this.bind(position, userAudio);
                else {
                    // The reply's audio is bound once the provider's speech ended or was interrupted (bounded).
                    if (this.pendingReply !== undefined) this.finishReply('complete');
                    this.pendingReply = position;
                    clearTimeout(this.replyTimer);
                    this.replyTimer = setTimeout(() => this.finishReply('complete'), REPLY_AUDIO_MS);
                    this.replyTimer.unref();
                    // Its speech already ended before the transcript was final.
                    if (this.state !== 'speaking' && !this.agentAudio.empty) this.finishReply('complete');
                }
            } catch (error) {
                this.problem = `A spoken message was not saved: ${(error as Error).message}`;
                this.archive.push(this.problem);
                this.host.log(`Voice in {${this.chat}}: ${this.problem}`);
            }
            this.changed();
        });
    }

    /** Binds the held agent audio to the saved spoken reply. */
    private finishReply(status: MessageAudioStatus): void {
        const position = this.pendingReply;
        if (position === undefined) return;
        this.pendingReply = undefined;
        clearTimeout(this.replyTimer);
        const parts = this.agentAudio.take(status);
        this.queue = this.queue.then(async () => await this.bind(position, parts));
    }

    /** Records parts for a message, reporting an incomplete archive honestly. */
    private async bind(position: number, parts: readonly MessageAudioInput[]): Promise<void> {
        if (!parts.length) {
            this.recordings.set(position, 'unavailable');
            return this.host.onChange();
        }
        try {
            const { problems } = await this.host.record(this.chat, position, parts);
            this.archive.push(...problems);
            this.recordings.set(position, 'saved');
        } catch (error) {
            this.recordings.set(position, 'unavailable');
            this.archive.push(`The recording of message ${position} was not saved: ${(error as Error).message}`);
        }
        this.host.onChange();
    }

    /** The user spoke over the reply (the provider cuts it off): its audio is marked interrupted. */
    private bargeIn(): void {
        this.agentAudio.interrupted = true;
        if (this.pendingReply !== undefined) this.finishReply('interrupted');
        this.state = 'listening';
    }

    /** Recorded audio from the page: the delivered microphone, or the agent's received voice. */
    private audio(side: 'user' | 'agent', pcm: Buffer, sampleRate: number): void {
        if (this.over || this.state === 'ending' || !this.session) return;
        if (side === 'agent') return this.agentAudio.add(pcm, sampleRate, this.offset());
        if (this.micMuted) return;
        this.user.add(pcm, sampleRate, this.offset());
    }

    /** A message of the media page. */
    private pageMessage(message: Readonly<Record<string, unknown>>): void {
        if (message.type === 'offer' && typeof message.sdp === 'string' && message.sdp.length < 64_000) {
            void this.negotiate(message.sdp);
        } else if (message.type === 'page') {
            if (message.mic === 'live' || message.mic === 'denied' || message.mic === 'missing' || message.mic === 'unavailable') this.mic = message.mic;
            if (message.playback === 'ok' || message.playback === 'blocked') this.playback = message.playback;
            if (message.rtc === 'failed') this.problem = 'The voice connection failed; reload the voice page or start voice again.';
            else this.problem = this.mic === 'denied' ? 'The browser denied the microphone; allow it on the voice page.' : this.mic === 'missing' ? 'No microphone was found.' : this.playback === 'blocked' ? 'The browser needs a click on the voice page to allow sound.' : undefined;
            // Listening only once the microphone is live and the provider connection exists.
            if (this.session && this.mic === 'live' && (this.state === 'awaiting-browser' || this.state === 'reconnecting' || this.state === 'connecting')) this.state = 'listening';
            if (this.mic !== 'live' && (this.state === 'listening' || this.state === 'connecting')) this.state = 'awaiting-browser';
            this.changed();
        } else if (message.type === 'barge-in') {
            this.bargeIn();
            if (this.state === 'speaking') this.state = 'listening';
            this.changed();
        } else if (message.type === 'output' && (message.state === 'speaking' || message.state === 'idle')) {
            if (message.state === 'idle') {
                this.finishReply(this.agentAudio.interrupted ? 'interrupted' : 'complete');
                if (this.state === 'speaking') this.state = 'listening';
            } else if (this.session && this.state !== 'ending') this.state = 'speaking';
            this.changed();
        }
    }

    /** Publishes the state to the page and every client. */
    private changed(): void {
        this.send({ type: 'state', view: { state: this.state, micMuted: this.micMuted, outputMuted: this.outputMuted, ...(this.problem ? { problem: this.problem } : {}) } });
        this.host.onChange();
    }

    /**
     * Ends the call (idempotent): provider session, microphone and playback, bridge and timers; flushes finalized
     * recordings and keeps untranscribed speech without inventing words.
     */
    public async end(reason: string, failed = false): Promise<void> {
        if (this.ending) return await this.ending;
        this.ending = (async () => {
            this.state = 'ending';
            this.changed();
            clearTimeout(this.pageTimer);
            clearTimeout(this.replyTimer);
            clearInterval(this.leaseTimer);
            await this.session?.end().catch(() => undefined);
            // The media surface releases the microphone, playback and its temporary listener on this event.
            this.send({ type: 'ended', reason });
            // Output still playing at the end was cut off.
            if (this.pendingReply !== undefined) this.finishReply('interrupted');
            await this.queue;
            for (const segment of [...this.user.take('incomplete'), ...this.agentAudio.take('incomplete')]) {
                const kept = await this.host.keepUntranscribed(this.chat, segment).catch(() => undefined);
                this.archive.push(kept ? `Speech without a transcript is kept at ${kept} (not bound to a message).` : 'Speech without a transcript could not be kept.');
            }
            this.state = failed ? 'failed' : 'ended';
            this.problem = failed ? reason : this.problem;
            this.endedAt = new Date().toISOString();
            const seconds = Math.round(this.offset() / 1000);
            this.host.log(`Voice call in {${this.chat}} ended after ${seconds} s (${reason})${this.usage ? `; backing usage ${JSON.stringify(this.usage)}` : ''}.`);
            this.changed();
        })();
        await this.ending;
    }

    /** Provider usage observed (cumulative) and the call duration, for Usage. */
    public usageSnapshot(): { readonly seconds: number; readonly usage?: Readonly<Record<string, number>> } {
        return { seconds: Math.round(((this.endedAt ? Date.parse(this.endedAt) : Date.now()) - this.started) / 1000), ...(this.usage ? { usage: this.usage } : {}) };
    }
}
