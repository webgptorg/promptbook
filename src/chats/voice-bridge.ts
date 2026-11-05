import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { voicePage } from './voice-page.js';

/**
 * Largest accepted WebSocket message from the media page (a microphone chunk is a few kilobytes).
 */
const MAX_MESSAGE_BYTES = 1024 * 1024;

/**
 * The WebSocket accept-key suffix of RFC 6455.
 */
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * What the media page reports and sends.
 *
 * @private voice media bridge
 */
export type VoiceBridgeHandlers = {
    /** Recorded PCM (mono Int16LE) at the page's announced rate: the microphone (`user`) or the agent's received voice (`agent`). */
    readonly onAudio: (side: 'user' | 'agent', pcm: Buffer, sampleRate: number) => void;
    /** A JSON message of the page (device/playback state, barge-in, playback idle). */
    readonly onMessage: (message: Readonly<Record<string, unknown>>) => void;
    /** The page took media ownership (first open or a reload). */
    readonly onAttached: () => void;
    /** The owning page went away (closed, reloaded or lost). */
    readonly onDetached: () => void;
};

/**
 * One accepted WebSocket connection (server side: unmasked outgoing frames, masked incoming ones).
 */
class MediaSocket {
    private buffer: Buffer = Buffer.alloc(0);
    private fragments: Buffer[] = [];
    private fragmentOpcode = 0;
    public closed = false;

    public constructor(
        private readonly socket: Duplex,
        private readonly onText: (text: string) => void,
        private readonly onBinary: (data: Buffer) => void,
        private readonly onClose: () => void,
    ) {
        socket.on('data', (chunk: Buffer) => this.receive(chunk));
        socket.on('close', () => this.finish());
        socket.on('error', () => this.finish());
    }

    /** Sends a text message. */
    public sendText(text: string): void {
        this.frame(0x1, Buffer.from(text, 'utf8'));
    }

    /** Closes with a code and reason. */
    public close(code = 1000, reason = ''): void {
        if (this.closed) return;
        const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
        payload.writeUInt16BE(code, 0);
        payload.write(reason, 2);
        this.frame(0x8, payload);
        this.socket.end();
        this.finish();
    }

    private finish(): void {
        if (this.closed) return;
        this.closed = true;
        this.socket.destroy();
        this.onClose();
    }

    private frame(opcode: number, payload: Buffer): void {
        if (this.closed || this.socket.destroyed) return;
        const length = payload.length;
        const header = length < 126 ? Buffer.alloc(2) : length < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
        header[0] = 0x80 | opcode;
        if (length < 126) header[1] = length;
        else if (length < 65536) {
            header[1] = 126;
            header.writeUInt16BE(length, 2);
        } else {
            header[1] = 127;
            header.writeBigUInt64BE(BigInt(length), 2);
        }
        this.socket.write(Buffer.concat([header, payload]));
    }

    private receive(chunk: Buffer): void {
        this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
        while (this.buffer.length >= 2 && !this.closed) {
            const first = this.buffer[0]!;
            const second = this.buffer[1]!;
            const fin = (first & 0x80) !== 0;
            const opcode = first & 0x0f;
            const masked = (second & 0x80) !== 0;
            let length = second & 0x7f;
            let offset = 2;
            if (length === 126) {
                if (this.buffer.length < 4) return;
                length = this.buffer.readUInt16BE(2);
                offset = 4;
            } else if (length === 127) {
                if (this.buffer.length < 10) return;
                const big = this.buffer.readBigUInt64BE(2);
                if (big > BigInt(MAX_MESSAGE_BYTES)) return this.close(1009, 'Message too large');
                length = Number(big);
                offset = 10;
            }
            // Browsers always mask client frames; an unmasked one is a protocol error.
            if (!masked) return this.close(1002, 'Unmasked frame');
            if (length > MAX_MESSAGE_BYTES) return this.close(1009, 'Message too large');
            if (this.buffer.length < offset + 4 + length) return;
            const mask = this.buffer.subarray(offset, offset + 4);
            const payload = Buffer.from(this.buffer.subarray(offset + 4, offset + 4 + length));
            for (let index = 0; index < payload.length; index++) payload[index]! ^= mask[index % 4]!;
            this.buffer = this.buffer.subarray(offset + 4 + length);
            if (opcode === 0x8) return this.close(1000);
            if (opcode === 0x9) {
                this.frame(0xa, payload);
                continue;
            }
            if (opcode === 0xa) continue;
            if (opcode === 0x0) {
                this.fragments.push(payload);
                if (this.fragments.reduce((sum, part) => sum + part.length, 0) > MAX_MESSAGE_BYTES) return this.close(1009, 'Message too large');
                if (!fin) continue;
                this.deliver(this.fragmentOpcode, Buffer.concat(this.fragments));
                this.fragments = [];
                continue;
            }
            if (!fin) {
                this.fragmentOpcode = opcode;
                this.fragments = [payload];
                continue;
            }
            this.deliver(opcode, payload);
        }
    }

    private deliver(opcode: number, payload: Buffer): void {
        if (opcode === 0x1) this.onText(payload.toString('utf8'));
        else if (opcode === 0x2) this.onBinary(payload);
    }
}

/**
 * Whether two secrets are equal (constant time).
 */
function sameSecret(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The call-owned loopback audio bridge of one voice call: it serves one dedicated media page and its media socket on
 * 127.0.0.1, authenticated by a private call token and the page's exact origin. It is independent of the project's
 * web dashboard and HTTP API, exposes no project operation and ends with its call. One page owns the media: a
 * duplicate page is refused, a reload reattaches to the same live call.
 *
 * @private voice media bridge
 */
export class VoiceBridge {
    private owner?: MediaSocket;
    private closedBridge = false;

    private constructor(
        private readonly server: Server,
        private readonly token: string,
        public readonly port: number,
        private readonly handlers: VoiceBridgeHandlers,
    ) {}

    /**
     * Starts the bridge on an ephemeral loopback port.
     */
    public static async start(page: { readonly agent: string; readonly chat: string }, handlers: VoiceBridgeHandlers): Promise<VoiceBridge> {
        const token = randomBytes(24).toString('base64url');
        let bridge: VoiceBridge | undefined;
        const server = createServer((request, response) => {
            const nonce = randomBytes(16).toString('base64');
            if (request.method !== 'GET' || !bridge || bridge.closedBridge || !sameSecret(request.url ?? '', `/voice/${token}`)) {
                response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('Not found.');
                return;
            }
            response.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'Referrer-Policy': 'no-referrer',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src ws://127.0.0.1:${bridge.port}; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
                'Permissions-Policy': `microphone=(self)`,
            });
            response.end(voicePage({ agent: page.agent, chat: page.chat, nonce, socket: `ws://127.0.0.1:${bridge.port}/voice/${token}/media` }));
        });
        server.on('upgrade', (request: IncomingMessage, socket: Duplex) => {
            if (bridge) bridge.upgrade(request, socket);
            else socket.destroy();
        });
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', () => resolve());
        });
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        bridge = new VoiceBridge(server, token, port, handlers);
        return bridge;
    }

    /** The private page URL (shown only to the controlling terminal; never persisted). */
    public get url(): string {
        return `http://127.0.0.1:${this.port}/voice/${this.token}`;
    }

    /** Whether a page owns the media now. */
    public get attached(): boolean {
        return Boolean(this.owner && !this.owner.closed);
    }

    /** Sends a JSON event to the owning page. */
    public send(event: Readonly<Record<string, unknown>>): void {
        this.owner?.sendText(JSON.stringify(event));
    }

    /** Ends the page's media and releases the port (idempotent). */
    public async close(reason = 'The voice call ended.'): Promise<void> {
        if (this.closedBridge) return;
        this.closedBridge = true;
        this.send({ type: 'ended', reason });
        this.owner?.close(1000, 'ended');
        this.owner = undefined;
        await new Promise<void>((resolve) => this.server.close(() => resolve()));
    }

    /** Accepts the media socket of the authorized page (exact token path and origin); refuses everything else. */
    private upgrade(request: IncomingMessage, socket: Duplex): void {
        const origin = `http://127.0.0.1:${this.port}`;
        const key = request.headers['sec-websocket-key'];
        const authorized = !this.closedBridge && sameSecret(request.url ?? '', `/voice/${this.token}/media`) && request.headers.origin === origin && typeof key === 'string' && request.headers['sec-websocket-version'] === '13';
        if (!authorized) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
        }
        const accept = createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');
        socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
        let media: MediaSocket | undefined;
        let pageRate = 24_000;
        media = new MediaSocket(
            socket,
            (text) => {
                if (media !== this.owner) return;
                let message: Record<string, unknown>;
                try {
                    message = JSON.parse(text) as Record<string, unknown>;
                } catch {
                    return;
                }
                if (!message || typeof message !== 'object') return;
                if (message.type === 'format' && typeof message.sampleRate === 'number' && message.sampleRate >= 8_000 && message.sampleRate <= 96_000) pageRate = message.sampleRate;
                this.handlers.onMessage(message);
            },
            (data) => {
                // One tag byte (0 microphone, 1 the agent's received voice), then PCM for the recording pipeline only.
                if (media !== this.owner || data.length < 3 || (data.length - 1) % 2 !== 0 || data[0]! > 1) return;
                this.handlers.onAudio(data[0] === 0 ? 'user' : 'agent', data.subarray(1), pageRate);
            },
            () => {
                if (media !== this.owner) return;
                this.owner = undefined;
                if (!this.closedBridge) this.handlers.onDetached();
            },
        );
        // One media owner: another tab of the same page gets an explanation and no microphone or playback.
        if (this.owner && !this.owner.closed) {
            media.sendText(JSON.stringify({ type: 'duplicate', reason: 'This call is already open in another tab; use that one.' }));
            media.close(4001, 'duplicate');
            return;
        }
        this.owner = media;
        this.handlers.onAttached();
    }
}
