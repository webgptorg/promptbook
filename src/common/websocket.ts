import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

/**
 * The WebSocket accept-key suffix of RFC 6455.
 */
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Default largest accepted message (a microphone chunk or an input batch is a few kilobytes).
 */
const DEFAULT_MAX_MESSAGE_BYTES = 1024 * 1024;

/**
 * What a server-side WebSocket reports.
 *
 * @private local WebSocket server
 */
export type ServerWebSocketHandlers = {
    /** A text message. */
    readonly onText: (text: string) => void;
    /** A binary message. */
    readonly onBinary?: (data: Buffer) => void;
    /** Any frame arrived (liveness), including pongs. */
    readonly onActivity?: () => void;
    /** The connection ended (closed by either side, lost or refused). */
    readonly onClose: () => void;
};

/**
 * One accepted server-side WebSocket (unmasked outgoing frames, masked incoming ones, bounded messages). It is the
 * minimal transport of local browser surfaces (voice media page, tab viewer), not a general WebSocket library.
 *
 * @private local WebSocket server
 */
export class ServerWebSocket {
    private buffer: Buffer = Buffer.alloc(0);
    private fragments: Buffer[] = [];
    private fragmentOpcode = 0;
    public closed = false;

    public constructor(
        private readonly socket: Duplex,
        private readonly handlers: ServerWebSocketHandlers,
        private readonly maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES,
    ) {
        socket.on('data', (chunk: Buffer) => this.receive(chunk));
        socket.on('close', () => this.finish());
        socket.on('error', () => this.finish());
    }

    /** Bytes queued in the socket but not yet written (backpressure of streamed media). */
    public get pending(): number {
        return (this.socket as Duplex & { writableLength?: number }).writableLength ?? 0;
    }

    /** Sends a text message. */
    public sendText(text: string): void {
        this.frame(0x1, Buffer.from(text, 'utf8'));
    }

    /** Sends a binary message. */
    public sendBinary(data: Buffer): void {
        this.frame(0x2, data);
    }

    /** Sends a ping (the browser answers with a pong even for a backgrounded page). */
    public ping(): void {
        this.frame(0x9, Buffer.alloc(0));
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
        this.handlers.onClose();
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
                if (big > BigInt(this.maxMessageBytes)) return this.close(1009, 'Message too large');
                length = Number(big);
                offset = 10;
            }
            // Browsers always mask client frames; an unmasked one is a protocol error.
            if (!masked) return this.close(1002, 'Unmasked frame');
            if (length > this.maxMessageBytes) return this.close(1009, 'Message too large');
            if (this.buffer.length < offset + 4 + length) return;
            const mask = this.buffer.subarray(offset, offset + 4);
            const payload = Buffer.from(this.buffer.subarray(offset + 4, offset + 4 + length));
            for (let index = 0; index < payload.length; index++) payload[index]! ^= mask[index % 4]!;
            this.buffer = this.buffer.subarray(offset + 4 + length);
            this.handlers.onActivity?.();
            if (opcode === 0x8) return this.close(1000);
            if (opcode === 0x9) {
                this.frame(0xa, payload);
                continue;
            }
            if (opcode === 0xa) continue;
            if (opcode === 0x0) {
                this.fragments.push(payload);
                if (this.fragments.reduce((sum, part) => sum + part.length, 0) > this.maxMessageBytes) return this.close(1009, 'Message too large');
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
        if (opcode === 0x1) this.handlers.onText(payload.toString('utf8'));
        else if (opcode === 0x2) this.handlers.onBinary?.(payload);
    }
}

/**
 * Completes the WebSocket upgrade handshake of an already authorized request and returns the connection, or refuses
 * a request that is not a valid version-13 upgrade (`undefined`).
 *
 * @private local WebSocket server
 */
export function acceptWebSocket(request: IncomingMessage, socket: Duplex, handlers: ServerWebSocketHandlers, maxMessageBytes?: number): ServerWebSocket | undefined {
    const key = request.headers['sec-websocket-key'];
    if (typeof key !== 'string' || request.headers['sec-websocket-version'] !== '13') {
        refuseUpgrade(socket, 400, 'Bad Request');
        return undefined;
    }
    const accept = createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    return new ServerWebSocket(socket, handlers, maxMessageBytes);
}

/**
 * Refuses an upgrade request with a plain HTTP status.
 *
 * @private local WebSocket server
 */
export function refuseUpgrade(socket: Duplex, status: number, text: string): void {
    socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}
