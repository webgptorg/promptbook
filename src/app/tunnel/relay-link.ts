import { Duplex } from 'node:stream';
import type { AppRelayView } from '../../engine/snapshot.js';
import type { EngineIdentity } from '../identity.js';
import { ConnectFailure, type TestTlsOptions } from '../net.js';
import type { RelayEndpoint } from '../settings.js';
import { CLOSE_CODE, FLOW_CONTROL_GRANT_BYTES, FRAME_HEADER_BYTES, FRAME_TYPE, FlowWindow, MAX_FRAME_PAYLOAD_BYTES, decodeFrame, encodeFrame, type CloseCode } from './frames.js';
import { TUNNEL_CLOSE_CODE, TUNNEL_PATH, TUNNEL_SUBPROTOCOL, checkTunnelReady, parseRelayMessage, signTunnelAuth, type TunnelAuth, type TunnelChallenge } from './handshake.js';
import { ClientWebSocket, connectWebSocket } from './websocket-client.js';

/**
 * Bound on TCP, proxy, TLS and the WebSocket upgrade.
 */
const CONNECT_TIMEOUT_MS = 15_000;

/**
 * Bound from the WebSocket opening to `ready`.
 */
const HANDSHAKE_TIMEOUT_MS = 15_000;

/**
 * WebSocket ping cadence and how long a pong may take.
 */
const PING_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;

/**
 * Reconnect backoff: full jitter over an exponential delay, reset after a healthy minute.
 */
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8_000;
const HEALTHY_RESET_MS = 60_000;

/**
 * Socket backlog above which streams wait for the WebSocket to drain.
 */
const SEND_HIGH_WATER_BYTES = 1024 * 1024;

/**
 * The browser's address as the relay saw it.
 *
 * @private App tunnel
 */
export type TunnelPeer = { readonly family: 4 | 6; readonly address: string; readonly port: number };

/**
 * Receives each browser stream a relay opens. A handler that does not take the stream calls `refuse()`.
 *
 * @private App tunnel
 */
export type TunnelStreamHandler = (stream: TunnelStream) => void;

/**
 * One browser stream through a tunnel: a duplex of the browser's encrypted TLS bytes, with the contract's credit-based
 * flow control in both directions.
 *
 * @private App tunnel
 */
export class TunnelStream extends Duplex {
    /** What this side may still send. */
    public readonly sendWindow = new FlowWindow();
    /** What the relay may still send. */
    public readonly receiveWindow = new FlowWindow();
    /** Credit consumed downstream but not yet granted back. */
    private ungranted = 0;
    private pendingWrite?: { chunk: Buffer; callback: (error?: Error | null) => void };
    private ended = false;

    public constructor(
        public readonly id: number,
        public readonly peer: TunnelPeer,
        private readonly link: { send: (frame: Uint8Array) => void; congested: () => boolean; whenDrained: (resume: () => void) => void; forget: (id: number) => void },
    ) {
        super({ allowHalfOpen: false });
    }

    /** Refuses the stream (`CLOSE REFUSED`), sending nothing else. */
    public refuse(): void {
        this.terminate(CLOSE_CODE.REFUSED, true);
    }

    /** Delivers relay DATA; `false` means the relay exceeded its credit. */
    public deliver(payload: Uint8Array): boolean {
        if (this.ended) return true;
        if (!this.receiveWindow.consume(payload.length)) return false;
        if (this.push(Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength))) this.grant(payload.length);
        else this.ungranted += payload.length;
        return true;
    }

    /** Applies a relay WINDOW grant; `false` means it over-granted. */
    public credit(increment: number): boolean {
        if (!this.sendWindow.grant(increment)) return false;
        this.flush();
        return true;
    }

    /** The relay closed the stream. */
    public closedByRelay(): void {
        this.ended = true;
        this.push(null);
        this.destroy();
    }

    /** Grants credit back once bytes left the readable buffer, coalescing small grants. */
    private grant(bytes: number): void {
        this.ungranted += bytes;
        if (this.ended) return;
        if (this.ungranted >= FLOW_CONTROL_GRANT_BYTES || this.receiveWindow.available < FLOW_CONTROL_GRANT_BYTES) {
            const increment = this.ungranted;
            this.ungranted = 0;
            if (this.receiveWindow.grant(increment)) this.link.send(encodeFrame({ type: FRAME_TYPE.WINDOW, streamId: this.id, increment }));
        }
    }

    public override _read(): void {
        if (this.ungranted > 0) this.grant(0);
    }

    public override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        this.pendingWrite = { chunk, callback };
        this.flush();
    }

    /** Sends as much pending DATA as the credit and the WebSocket allow. */
    private flush(): void {
        const pending = this.pendingWrite;
        if (!pending || this.ended) return;
        while (pending.chunk.length > 0) {
            if (this.link.congested()) {
                this.link.whenDrained(() => this.flush());
                return;
            }
            const size = Math.min(pending.chunk.length, MAX_FRAME_PAYLOAD_BYTES, this.sendWindow.available);
            if (size <= 0) return;
            this.sendWindow.consume(size);
            this.link.send(encodeFrame({ type: FRAME_TYPE.DATA, streamId: this.id, payload: pending.chunk.subarray(0, size) }));
            pending.chunk = pending.chunk.subarray(size);
        }
        this.pendingWrite = undefined;
        pending.callback();
    }

    public override _final(callback: (error?: Error | null) => void): void {
        this.terminate(CLOSE_CODE.NORMAL, true);
        callback();
    }

    public override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        this.terminate(error ? CLOSE_CODE.RESET : CLOSE_CODE.NORMAL, true);
        callback(error);
    }

    /** Ends the stream once, telling the relay unless it closed it. */
    public terminate(code: CloseCode, notify: boolean): void {
        if (this.ended) return;
        this.ended = true;
        if (notify) this.link.send(encodeFrame({ type: FRAME_TYPE.CLOSE, streamId: this.id, code }));
        this.link.forget(this.id);
        this.pendingWrite?.callback(new Error('The tunnel stream closed.'));
        this.pendingWrite = undefined;
        if (!this.destroyed) this.destroy();
    }
}

/**
 * Formats an OPEN address.
 */
function formatAddress(family: 4 | 6, bytes: Uint8Array): string {
    if (family === 4) return Array.from(bytes).join('.');
    const groups: string[] = [];
    for (let index = 0; index < 16; index += 2) groups.push(((bytes[index]! << 8) | bytes[index + 1]!).toString(16));
    return groups.join(':');
}

/**
 * Refuses every stream: the default until the engine ends browser TLS itself.
 *
 * @private App tunnel
 */
export const refuseStreams: TunnelStreamHandler = (stream) => stream.refuse();

/**
 * Keeps one tunnel to one relay: dial, handshake, frames, pings and reconnects with backoff. Independent of every other
 * relay's link.
 *
 * @private App tunnel
 */
export class RelayLink {
    private state: AppRelayView['state'] = 'connecting';
    private since = new Date().toISOString();
    private problem?: string;
    private refusal?: AppRelayView['refusal'];
    private retryAt?: string;
    private hostnames?: readonly string[];
    private socket?: ClientWebSocket;
    private stopped = false;
    private failures = 0;
    private timer?: NodeJS.Timeout;
    private readonly streams = new Map<number, TunnelStream>();
    private drainWaiters: Array<() => void> = [];

    public constructor(
        private readonly options: {
            readonly relay: RelayEndpoint;
            readonly identity: EngineIdentity;
            readonly version: string;
            readonly env: NodeJS.ProcessEnv;
            readonly onChange: () => void;
            readonly onStream?: TunnelStreamHandler;
            readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
            readonly tls?: TestTlsOptions;
        },
    ) {}

    /** The relay this link dials. */
    public get relay(): string {
        return this.options.relay.id;
    }

    /** Starts dialling. */
    public start(): void {
        this.stopped = false;
        void this.attempt();
    }

    /** Closes the tunnel and stops reconnecting. */
    public stop(): void {
        this.stopped = true;
        clearTimeout(this.timer);
        for (const stream of [...this.streams.values()]) stream.terminate(CLOSE_CODE.RESET, false);
        this.socket?.close(1000);
        this.socket = undefined;
        this.setState('stopped', this.refusal ? this.problem : undefined);
    }

    /** The link's view. */
    public view(): AppRelayView {
        return {
            relay: this.options.relay.id,
            state: this.state,
            since: this.since,
            ...(this.problem ? { problem: this.problem } : {}),
            ...(this.retryAt && this.state === 'waiting' ? { retryAt: this.retryAt } : {}),
            ...(this.refusal ? { refusal: this.refusal } : {}),
            ...(this.hostnames && this.state === 'connected' ? { hostnames: this.hostnames } : {}),
            streams: this.streams.size,
        };
    }

    /** Changes the state and notifies. */
    private setState(state: AppRelayView['state'], problem?: string): void {
        if (this.state !== state) this.since = new Date().toISOString();
        this.state = state;
        this.problem = problem;
        this.options.onChange();
    }

    /** One connection attempt, through to its close. */
    private async attempt(): Promise<void> {
        if (this.stopped) return;
        this.setState('connecting', this.problem);
        const relay = this.options.relay;
        let challenge: TunnelChallenge | undefined;
        let auth: TunnelAuth | undefined;
        let ready = false;
        let healthyTimer: NodeJS.Timeout | undefined;
        let pingTimer: NodeJS.Timeout | undefined;
        let pongTimer: NodeJS.Timeout | undefined;
        let lastStreamId = 0;
        let closeNote: string | undefined;
        let socket: ClientWebSocket | undefined;
        let handshakeTimer: NodeJS.Timeout | undefined;
        let failed = false;
        // The close frame is sent and the socket ends after the relay's answer (or a short grace); nothing the relay
        // sends meanwhile is handled.
        const protocolError = (note: string): void => {
            if (failed) return;
            failed = true;
            closeNote = note;
            socket?.close(TUNNEL_CLOSE_CODE.PROTOCOL_ERROR);
        };
        const onText = (text: string): void => {
            if (failed) return;
            const message = parseRelayMessage(text);
            if (ready || !message) return protocolError('The relay sent an invalid handshake message.');
            if (message.type === 'reject') {
                closeNote = `The relay refused the tunnel (${message.reason}).`;
                if (message.reason === 'suspended') this.refusal = 'suspended';
                else if (message.reason === 'auth-failed') this.refusal = 'auth-failed';
                return;
            }
            if (message.type === 'challenge') {
                if (challenge) return protocolError('The relay sent a second challenge.');
                challenge = message;
                void signTunnelAuth(this.options.identity, message, this.options.version, relay.id).then((signed) => {
                    if (signed.kind === 'wrong-relay') return protocolError('The relay presented another relay’s challenge; the engine did not answer it.');
                    if (failed) return;
                    auth = signed.auth;
                    socket?.sendText(JSON.stringify(signed.auth));
                }, () => protocolError('The engine could not sign the tunnel challenge.'));
                return;
            }
            if (!challenge || !auth || !checkTunnelReady(challenge, auth, message)) return protocolError('The relay’s choice of protocol does not match the offers; the engine closed the tunnel.');
            ready = true;
            clearTimeout(handshakeTimer);
            this.hostnames = message.hostnames;
            this.refusal = undefined;
            this.retryAt = undefined;
            const defaultHost = `${this.options.identity.engineId}.`;
            if (!message.hostnames.some((name) => name.startsWith(defaultHost))) this.options.log?.(`Relay ${relay.id} does not route this engine’s default hostname.`, 'warning');
            this.setState('connected');
            healthyTimer = setTimeout(() => (this.failures = 0), HEALTHY_RESET_MS);
            healthyTimer.unref();
            pingTimer = setInterval(() => {
                if (pongTimer) return;
                socket?.ping();
                pongTimer = setTimeout(() => {
                    closeNote = 'The relay stopped answering pings.';
                    socket?.terminate();
                }, PONG_TIMEOUT_MS);
                pongTimer.unref();
            }, PING_INTERVAL_MS);
            pingTimer.unref();
        };
        const onBinary = (data: Uint8Array): void => {
            if (failed) return;
            if (!ready) return protocolError('The relay sent a frame before the handshake completed.');
            const decoded = decodeFrame(data);
            if (decoded.kind === 'ignored') return;
            if (decoded.kind === 'invalid') return protocolError(`The relay sent an invalid frame (${decoded.reason}).`);
            const frame = decoded.frame;
            const stream = this.streams.get(frame.streamId);
            if (frame.type === FRAME_TYPE.OPEN) {
                if (frame.streamId <= lastStreamId) return protocolError('The relay reused a stream ID.');
                lastStreamId = frame.streamId;
                const opened = new TunnelStream(frame.streamId, { family: frame.family, address: formatAddress(frame.family, frame.address), port: frame.port }, {
                    send: (bytes) => socket?.sendBinary(bytes),
                    congested: () => (socket?.bufferedAmount ?? 0) > SEND_HIGH_WATER_BYTES,
                    whenDrained: (resume) => this.drainWaiters.push(resume),
                    forget: (id) => {
                        this.streams.delete(id);
                        this.options.onChange();
                    },
                });
                this.streams.set(frame.streamId, opened);
                (this.options.onStream ?? refuseStreams)(opened);
                this.options.onChange();
                return;
            }
            if (!stream) {
                // A late frame for a closed stream is dropped; one for a stream never opened is a protocol error.
                if (frame.streamId > lastStreamId) protocolError('The relay sent a frame for a stream it never opened.');
                return;
            }
            if (frame.type === FRAME_TYPE.DATA) {
                if (!stream.deliver(frame.payload)) {
                    stream.terminate(CLOSE_CODE.FLOW_CONTROL, true);
                    protocolError('The relay sent more data than the engine granted.');
                }
            } else if (frame.type === FRAME_TYPE.WINDOW) {
                if (!stream.credit(frame.increment)) stream.terminate(CLOSE_CODE.FLOW_CONTROL, true);
            } else {
                this.streams.delete(frame.streamId);
                stream.closedByRelay();
                this.options.onChange();
            }
        };
        const closed = new Promise<number>((resolve) => {
            void connectWebSocket({
                host: relay.id,
                port: relay.port,
                path: TUNNEL_PATH,
                protocol: TUNNEL_SUBPROTOCOL,
                env: this.options.env,
                timeoutMs: CONNECT_TIMEOUT_MS,
                maxMessageBytes: FRAME_HEADER_BYTES + MAX_FRAME_PAYLOAD_BYTES,
                tls: this.options.tls,
                handlers: {
                    onText,
                    onBinary,
                    onPong: () => {
                        clearTimeout(pongTimer);
                        pongTimer = undefined;
                    },
                    onDrain: () => {
                        const waiters = this.drainWaiters;
                        this.drainWaiters = [];
                        for (const resume of waiters) resume();
                    },
                    onClose: (code) => resolve(code),
                },
            }).then(
                (opened) => {
                    if (this.stopped) {
                        opened.close(1000);
                        resolve(1000);
                        return;
                    }
                    socket = opened;
                    this.socket = opened;
                    handshakeTimer = setTimeout(() => {
                        closeNote = 'The relay did not complete the handshake in time.';
                        opened.close(TUNNEL_CLOSE_CODE.AUTH_FAILED);
                        opened.terminate();
                    }, HANDSHAKE_TIMEOUT_MS);
                    handshakeTimer.unref();
                    opened.start();
                },
                (error: unknown) => {
                    closeNote = error instanceof ConnectFailure ? `${error.message}` : 'The relay could not be reached.';
                    resolve(1006);
                },
            );
        });
        const code = await closed;
        clearTimeout(handshakeTimer);
        clearTimeout(healthyTimer);
        clearInterval(pingTimer);
        clearTimeout(pongTimer);
        this.socket = undefined;
        for (const stream of [...this.streams.values()]) stream.terminate(CLOSE_CODE.RESET, false);
        this.drainWaiters = [];
        if (this.stopped) return;
        this.afterClose(code, ready, closeNote);
    }

    /** Applies the close-code policy: stop on REPLACED, reconnect soon on SHUTTING_DOWN, otherwise back off. */
    private afterClose(code: number, wasReady: boolean, note: string | undefined): void {
        if (code === TUNNEL_CLOSE_CODE.REPLACED) {
            this.refusal = 'replaced';
            this.options.log?.(`Relay ${this.options.relay.id} replaced this engine’s tunnel with a newer one for the same engine key; another copy of this project holds the key. The engine stopped dialling that relay.`, 'error');
            this.stopped = true;
            this.setState('stopped', 'Another process with this project’s engine key took over the tunnel (for example a copy of the project directory with its .ptbk folder). Stop that copy, then restart this engine.');
            return;
        }
        if (code === TUNNEL_CLOSE_CODE.SUSPENDED) this.refusal = 'suspended';
        else if (code === TUNNEL_CLOSE_CODE.AUTH_FAILED && !note) this.refusal = 'auth-failed';
        else if (code === TUNNEL_CLOSE_CODE.PROTOCOL_ERROR && !note) this.refusal = 'protocol';
        const problem =
            note ??
            (code === TUNNEL_CLOSE_CODE.SUSPENDED
                ? 'The Promptbook App suspended this engine.'
                : code === TUNNEL_CLOSE_CODE.AUTH_FAILED
                  ? 'The relay did not accept this engine (unknown engine, key mismatch or registry unavailable).'
                  : code === TUNNEL_CLOSE_CODE.SHUTTING_DOWN
                    ? 'The relay is restarting.'
                    : code === TUNNEL_CLOSE_CODE.FRAME_BUDGET
                      ? 'The relay limited this engine’s frame rate.'
                      : code === 1013
                        ? 'The relay is limiting connection attempts.'
                        : wasReady
                          ? 'The tunnel closed.'
                          : 'The relay closed the connection before the handshake completed.');
        const delay = code === TUNNEL_CLOSE_CODE.SHUTTING_DOWN ? Math.random() * 1000 : Math.random() * Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** this.failures);
        this.failures = code === TUNNEL_CLOSE_CODE.SHUTTING_DOWN ? 0 : Math.min(this.failures + 1, 30);
        this.retryAt = new Date(Date.now() + delay).toISOString();
        this.setState('waiting', problem);
        this.timer = setTimeout(() => void this.attempt(), delay);
        this.timer.unref();
    }
}
