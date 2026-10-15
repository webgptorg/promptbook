import { createConnection, createServer, type Server, type Socket } from 'node:net';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shortHash } from './ids.js';

/**
 * Maximal size of one IPC message (bytes).
 */
const MAX_MESSAGE_BYTES = 16 * 1024 * 1024;

/**
 * Builds a local IPC address: a named pipe on Windows, a short Unix socket path elsewhere.
 *
 * @private local IPC
 */
export function ipcAddress(seed: string): string {
    const name = `ptbk-${shortHash(seed, 16)}`;
    return process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : join(tmpdir(), `${name}.sock`);
}

/**
 * A running IPC server.
 *
 * @private local IPC
 */
export type IpcServer = {
    /** Listening address. */
    readonly address: string;
    /** Stops listening and removes the socket file. */
    readonly close: () => Promise<void>;
};

/**
 * Starts a server answering one JSON request per connection with one JSON response.
 *
 * @private local IPC
 */
export async function startIpcServer(address: string, handler: (request: unknown, socket: Socket) => Promise<unknown>): Promise<IpcServer> {
    if (process.platform !== 'win32') await rm(address, { force: true });
    const server: Server = createServer((socket) => {
        let buffer = '';
        let handled = false;
        socket.setEncoding('utf8');
        socket.on('error', () => undefined);
        socket.on('data', (chunk: string) => {
            if (handled) return;
            buffer += chunk;
            if (buffer.length > MAX_MESSAGE_BYTES) {
                handled = true;
                socket.end(`${JSON.stringify({ ok: false, error: 'Message too large.' })}\n`);
                return;
            }
            const newline = buffer.indexOf('\n');
            if (newline < 0) return;
            handled = true;
            let request: unknown;
            try {
                request = JSON.parse(buffer.slice(0, newline));
            } catch {
                socket.end(`${JSON.stringify({ ok: false, error: 'Invalid JSON.' })}\n`);
                return;
            }
            handler(request, socket)
                .then((result) => {
                    if (!socket.destroyed) socket.end(`${JSON.stringify({ ok: true, result })}\n`);
                })
                .catch((error: unknown) => {
                    if (!socket.destroyed) socket.end(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), details: (error as { details?: unknown }).details })}\n`);
                });
        });
    });
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(address, () => {
            server.off('error', reject);
            resolve();
        });
    });
    return {
        address,
        close: async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()));
            if (process.platform !== 'win32') await rm(address, { force: true });
        },
    };
}

/**
 * Error raised by an IPC request (connection failure or remote error).
 *
 * @private local IPC
 */
export class IpcError extends Error {
    public constructor(
        message: string,
        /** `connect`: endpoint unreachable; `lost`: reply lost; `remote`: handler error. */
        public readonly stage: 'connect' | 'lost' | 'remote',
        /** Structured details of a remote error. */
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'IpcError';
    }
}

/**
 * Sends one JSON request and awaits its JSON response.
 *
 * @private local IPC
 */
export async function ipcRequest<T>(address: string, request: unknown, timeoutMs = 30_000): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
        let connected = false;
        let buffer = '';
        let settled = false;
        const socket = createConnection(address);
        const finish = (error?: IpcError, value?: T): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            if (error) reject(error);
            else resolve(value as T);
        };
        const timer = setTimeout(() => finish(new IpcError('The request timed out.', connected ? 'lost' : 'connect')), timeoutMs);
        socket.setEncoding('utf8');
        socket.on('connect', () => {
            connected = true;
            socket.write(`${JSON.stringify(request)}\n`);
        });
        socket.on('data', (chunk: string) => {
            buffer += chunk;
            const newline = buffer.indexOf('\n');
            if (newline < 0) return;
            try {
                const response = JSON.parse(buffer.slice(0, newline)) as { ok: boolean; result?: T; error?: string; details?: unknown };
                if (response.ok) finish(undefined, response.result);
                else finish(new IpcError(response.error ?? 'Request failed.', 'remote', response.details));
            } catch {
                finish(new IpcError('Invalid response.', 'lost'));
            }
        });
        socket.on('error', (error) => finish(new IpcError(error.message, connected ? 'lost' : 'connect')));
        socket.on('close', () => finish(new IpcError('The connection closed without a reply.', connected ? 'lost' : 'connect')));
    });
}
