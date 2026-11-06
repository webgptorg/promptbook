import { createHash, randomBytes } from 'node:crypto';
import type { TLSSocket } from 'node:tls';
import { ConnectFailure, openTls, type TestTlsOptions } from '../net.js';

/**
 * The WebSocket accept-key suffix of RFC 6455.
 */
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Largest HTTP upgrade answer read.
 */
const MAX_UPGRADE_RESPONSE_BYTES = 16_384;

/**
 * What a client WebSocket reports.
 *
 * @private App tunnel
 */
export type ClientWebSocketHandlers = {
    readonly onText: (text: string) => void;
    readonly onBinary: (data: Uint8Array) => void;
    readonly onPong?: () => void;
    /** The connection ended; `code` is the peer's close code (1006 when none was received). */
    readonly onClose: (code: number, reason: string) => void;
    /** The socket can take more data after backpressure. */
    readonly onDrain?: () => void;
};

/**
 * One client WebSocket (RFC 6455) over a verified TLS socket: masked outgoing frames, unmasked incoming ones, bounded
 * messages, no extensions (so no compression of the TLS ciphertext it carries).
 *
 * @private App tunnel
 */
export class ClientWebSocket {
    private buffer: Buffer = Buffer.alloc(0);
    private fragments: Buffer[] = [];
    private fragmentBytes = 0;
    private fragmentOpcode = 0;
    private closeSent = false;
    private finished = false;
    private readonly decoder = new TextDecoder('utf-8', { fatal: true });

    public constructor(
        private readonly socket: TLSSocket,
        private readonly handlers: ClientWebSocketHandlers,
        private readonly maxMessageBytes: number,
        private readonly initial: Buffer,
    ) {
        socket.on('close', () => this.finish(1006, ''));
        socket.on('error', () => this.finish(1006, ''));
        socket.on('drain', () => this.handlers.onDrain?.());
    }

    /**
     * Starts delivering messages: the bytes that arrived with the upgrade answer first, then the paused socket. The
     * caller calls it once it holds this object, so no message reaches a handler before then.
     */
    public start(): void {
        this.socket.on('data', (chunk: Buffer) => this.receive(chunk));
        if (this.initial.length) this.receive(this.initial);
        this.socket.resume();
    }

    /** Bytes queued in the socket but not yet written. */
    public get bufferedAmount(): number {
        return this.socket.writableLength;
    }

    /** Whether the connection is still usable for sending. */
    public get open(): boolean {
        return !this.finished && !this.closeSent;
    }

    /** Sends a text message. */
    public sendText(text: string): boolean {
        return this.frame(0x1, Buffer.from(text, 'utf8'));
    }

    /** Sends a binary message; `false` signals backpressure (wait for `onDrain`). */
    public sendBinary(data: Uint8Array): boolean {
        return this.frame(0x2, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    }

    /** Sends a ping. */
    public ping(): void {
        this.frame(0x9, randomBytes(4));
    }

    /** Starts the closing handshake with a code; the socket ends when the peer answers or after a short grace. */
    public close(code: number, reason = ''): void {
        if (this.finished || this.closeSent) return;
        const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
        payload.writeUInt16BE(code, 0);
        payload.write(reason, 2);
        this.frame(0x8, payload);
        this.closeSent = true;
        setTimeout(() => this.socket.destroy(), 2000).unref();
    }

    /** Ends the connection at once. */
    public terminate(): void {
        this.socket.destroy();
        this.finish(1006, '');
    }

    /** Writes one masked frame. */
    private frame(opcode: number, payload: Buffer): boolean {
        if (this.finished || (this.closeSent && opcode !== 0x8)) return false;
        const length = payload.length;
        const header = length < 126 ? Buffer.alloc(2) : length < 65_536 ? Buffer.alloc(4) : Buffer.alloc(10);
        header[0] = 0x80 | opcode;
        if (length < 126) header[1] = 0x80 | length;
        else if (length < 65_536) {
            header[1] = 0x80 | 126;
            header.writeUInt16BE(length, 2);
        } else {
            header[1] = 0x80 | 127;
            header.writeBigUInt64BE(BigInt(length), 2);
        }
        const mask = randomBytes(4);
        const masked = Buffer.allocUnsafe(length);
        for (let index = 0; index < length; index++) masked[index] = payload[index]! ^ mask[index & 3]!;
        return this.socket.write(Buffer.concat([header, mask, masked]));
    }

    /** Parses incoming frames. */
    private receive(chunk: Buffer): void {
        if (this.finished) return;
        this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
        while (this.buffer.length >= 2 && !this.finished) {
            const first = this.buffer[0]!;
            const second = this.buffer[1]!;
            const fin = (first & 0x80) !== 0;
            const opcode = first & 0x0f;
            if (first & 0x70 || second & 0x80) return this.fail(1002);
            let length = second & 0x7f;
            let offset = 2;
            if (length === 126) {
                if (this.buffer.length < 4) return;
                length = this.buffer.readUInt16BE(2);
                offset = 4;
            } else if (length === 127) {
                if (this.buffer.length < 10) return;
                const big = this.buffer.readBigUInt64BE(2);
                if (big > BigInt(this.maxMessageBytes)) return this.fail(1009);
                length = Number(big);
                offset = 10;
            }
            const control = opcode >= 0x8;
            if (control && (!fin || length > 125)) return this.fail(1002);
            if (!control && this.fragmentBytes + length > this.maxMessageBytes) return this.fail(1009);
            if (this.buffer.length < offset + length) return;
            const payload = this.buffer.subarray(offset, offset + length);
            this.buffer = this.buffer.subarray(offset + length);
            if (control) {
                this.control(opcode, payload);
                continue;
            }
            if (opcode === 0x0) {
                if (!this.fragmentOpcode) return this.fail(1002);
            } else if (opcode === 0x1 || opcode === 0x2) {
                if (this.fragmentOpcode) return this.fail(1002);
                this.fragmentOpcode = opcode;
            } else return this.fail(1002);
            this.fragments.push(Buffer.from(payload));
            this.fragmentBytes += payload.length;
            if (!fin) continue;
            const message = this.fragments.length === 1 ? this.fragments[0]! : Buffer.concat(this.fragments);
            const kind = this.fragmentOpcode;
            this.fragments = [];
            this.fragmentBytes = 0;
            this.fragmentOpcode = 0;
            if (kind === 0x1) {
                let text: string;
                try {
                    text = this.decoder.decode(message);
                } catch {
                    return this.fail(1007);
                }
                this.handlers.onText(text);
            } else this.handlers.onBinary(new Uint8Array(message.buffer, message.byteOffset, message.byteLength));
        }
    }

    /** Handles a control frame. */
    private control(opcode: number, payload: Buffer): void {
        if (opcode === 0x9) this.frame(0xa, Buffer.from(payload));
        else if (opcode === 0xa) this.handlers.onPong?.();
        else if (opcode === 0x8) {
            const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
            let reason = '';
            try {
                reason = payload.length > 2 ? this.decoder.decode(payload.subarray(2)) : '';
            } catch {
                reason = '';
            }
            if (!this.closeSent) {
                const answer = Buffer.alloc(payload.length >= 2 ? 2 : 0);
                if (payload.length >= 2) answer.writeUInt16BE(code, 0);
                this.frame(0x8, answer);
                this.closeSent = true;
            }
            this.socket.end();
            this.finish(code, reason);
        } else this.fail(1002);
    }

    /** Fails the connection with a close code. */
    private fail(code: number): void {
        this.close(code);
        this.socket.destroy();
        this.finish(code, '');
    }

    /** Reports the end once. */
    private finish(code: number, reason: string): void {
        if (this.finished) return;
        this.finished = true;
        this.handlers.onClose(code, reason);
    }
}

/**
 * Opens a WebSocket to `wss://host:port/path` with one subprotocol, verifying the server certificate for `host` (also
 * through a proxy) and the upgrade answer, all within `timeoutMs`.
 *
 * @private App tunnel
 */
export async function connectWebSocket(input: {
    readonly host: string;
    readonly port: number;
    readonly path: string;
    readonly protocol: string;
    readonly env: NodeJS.ProcessEnv;
    readonly timeoutMs: number;
    readonly maxMessageBytes: number;
    readonly handlers: ClientWebSocketHandlers;
    readonly tls?: TestTlsOptions;
}): Promise<ClientWebSocket> {
    const deadline = Date.now() + input.timeoutMs;
    const socket = await openTls({ host: input.host, port: input.port, alpn: ['http/1.1'], env: input.env, timeoutMs: input.timeoutMs, tls: input.tls });
    const key = randomBytes(16).toString('base64');
    const hostHeader = input.port === 443 ? input.host : `${input.host}:${String(input.port)}`;
    socket.write(`GET ${input.path} HTTP/1.1\r\nHost: ${hostHeader}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Protocol: ${input.protocol}\r\n\r\n`);
    const expectedAccept = createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');
    return await new Promise<ClientWebSocket>((resolve, reject) => {
        let buffered = Buffer.alloc(0);
        const timer = setTimeout(() => fail('timeout', 'The relay did not accept the WebSocket in time.'), Math.max(1, deadline - Date.now()));
        const fail = (kind: 'timeout' | 'upgrade' | 'network', message: string): void => {
            clearTimeout(timer);
            socket.off('data', onData);
            socket.destroy();
            reject(new ConnectFailure(kind, message));
        };
        const onData = (chunk: Buffer): void => {
            buffered = Buffer.concat([buffered, chunk]);
            const end = buffered.indexOf('\r\n\r\n');
            if (end < 0) {
                if (buffered.length > MAX_UPGRADE_RESPONSE_BYTES) fail('upgrade', 'The relay sent an oversized upgrade answer.');
                return;
            }
            const [statusLine, ...lines] = buffered.subarray(0, end).toString('latin1').split('\r\n');
            const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(statusLine ?? '')?.[1] ?? 0);
            const headers = new Map<string, string>();
            for (const line of lines) {
                const colon = line.indexOf(':');
                if (colon > 0) headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
            }
            if (status !== 101) return fail('upgrade', `The relay refused the WebSocket upgrade (HTTP ${String(status || 'unknown')}).`);
            if (headers.get('upgrade')?.toLowerCase() !== 'websocket' || !/(^|,)\s*upgrade\s*(,|$)/i.test(headers.get('connection') ?? '')) return fail('upgrade', 'The relay sent an invalid WebSocket upgrade.');
            if (headers.get('sec-websocket-accept') !== expectedAccept) return fail('upgrade', 'The relay sent a wrong WebSocket accept key.');
            if (headers.get('sec-websocket-protocol') !== input.protocol) return fail('upgrade', `The relay did not accept the ${input.protocol} subprotocol.`);
            if (headers.has('sec-websocket-extensions')) return fail('upgrade', 'The relay negotiated a WebSocket extension that was not offered.');
            clearTimeout(timer);
            socket.off('data', onData);
            socket.off('error', onError);
            // Paused until `start()`, so nothing is lost or delivered before the caller holds the WebSocket.
            socket.pause();
            resolve(new ClientWebSocket(socket, input.handlers, input.maxMessageBytes, Buffer.from(buffered.subarray(end + 4))));
        };
        const onError = (): void => fail('network', 'The connection to the relay failed during the upgrade.');
        socket.on('data', onData);
        socket.once('error', onError);
    });
}
