import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { TLSSocket } from 'node:tls';
import { errorMessage } from '../../common/errors.js';
import type { TunnelStream } from '../tunnel/relay-link.js';
import { CertificateManager, type CertificateSourceKind, type CertificateView } from './certificates.js';
import { Gateway, withSecurityHeaders, contractProblem, type GatewayOptions } from './gateway.js';
import { TlsTerminator, type SecureConnectionInfo } from './tls.js';
import type { TestTlsOptions } from '../net.js';

/**
 * Bounds of the HTTP layer inside the tunnel.
 */
const HEADERS_TIMEOUT_MS = 20_000;
const REQUEST_TIMEOUT_MS = 120_000;
const KEEP_ALIVE_TIMEOUT_MS = 30_000;
const MAX_HEADER_BYTES = 32 * 1024;

/**
 * Options of the engine's own web origin.
 *
 * @private App web origin
 */
export type EngineOriginOptions = Omit<GatewayOptions, 'log'> & {
    /** The App data directory (certificates, ACME account, access state). */
    readonly directory: string;
    /** The engine's hostname (`<engineId>.<engine domain>`). */
    readonly hostname: string;
    readonly certificateSource: CertificateSourceKind;
    readonly env: NodeJS.ProcessEnv;
    readonly tunnelReady: () => boolean;
    readonly onChange: () => void;
    readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
    readonly tls?: TestTlsOptions;
};

/**
 * Converts a Node request into a Web `Request` on the engine's origin.
 */
function webRequest(request: IncomingMessage, abort: AbortSignal): Request {
    const host = request.headers.host ?? 'invalid.invalid';
    const headers = new Headers();
    for (let index = 0; index < request.rawHeaders.length; index += 2) headers.append(request.rawHeaders[index] ?? '', request.rawHeaders[index + 1] ?? '');
    const method = request.method ?? 'GET';
    const hasBody = method !== 'GET' && method !== 'HEAD';
    return new Request(`https://${host}${request.url ?? '/'}`, {
        method,
        headers,
        signal: abort,
        ...(hasBody ? { body: Readable.toWeb(request) as unknown as ReadableStream<Uint8Array>, duplex: 'half' } : {}),
    } as RequestInit);
}

/**
 * Writes a Web `Response` to a Node response, streaming the body with backpressure (SSE included).
 */
async function writeResponse(response: Response, target: ServerResponse, method: string): Promise<void> {
    const headers: Record<string, string | string[]> = {};
    response.headers.forEach((value, name) => {
        if (name !== 'set-cookie') headers[name] = value;
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) headers['set-cookie'] = cookies;
    target.writeHead(response.status, headers);
    if (!response.body || method === 'HEAD') {
        target.end();
        return;
    }
    if (response.headers.get('content-type')?.startsWith('text/event-stream')) target.flushHeaders();
    const reader = response.body.getReader();
    const stop = (): void => void reader.cancel().catch(() => undefined);
    target.once('close', stop);
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!target.write(value)) await new Promise<void>((resolve) => target.once('drain', resolve));
            if (target.destroyed) break;
        }
        target.end();
    } catch {
        target.destroy();
    } finally {
        target.off('close', stop);
    }
}

/**
 * The engine's own web origin inside the App tunnels: certificates (ACME, or the conformance build's development
 * CA), the TLS terminator with its ClientHello router, an HTTP/1.1 server that never listens, and the gateway in
 * front of the engine API and the UI. Browser TLS ends here, so relays only ever carry ciphertext.
 *
 * @private App web origin
 */
export class EngineOrigin {
    public readonly certificates: CertificateManager;
    private readonly terminator: TlsTerminator;
    private readonly http: Server;
    private readonly gateway: Gateway;
    private readonly connections = new WeakMap<object, SecureConnectionInfo>();

    public constructor(private readonly options: EngineOriginOptions) {
        this.certificates = new CertificateManager({
            directory: options.directory,
            hostname: options.hostname,
            source: options.certificateSource,
            env: options.env,
            tunnelReady: options.tunnelReady,
            onChange: options.onChange,
            log: options.log,
            tls: options.tls,
        });
        this.gateway = new Gateway(options);
        this.http = createServer({ headersTimeout: HEADERS_TIMEOUT_MS, requestTimeout: REQUEST_TIMEOUT_MS, keepAliveTimeout: KEEP_ALIVE_TIMEOUT_MS, maxHeaderSize: MAX_HEADER_BYTES }, (request, response) => void this.serve(request, response));
        this.http.on('clientError', (_error, socket) => socket.destroy());
        this.terminator = new TlsTerminator({
            credentials: (hostname) => this.certificates.credentials(hostname),
            challenge: (hostname) => this.certificates.challenge(hostname),
            onSecureConnection: (socket, info) => this.accept(socket, info),
            log: (text) => options.log?.(text, 'info'),
        });
    }

    /** Loads or issues the certificate. */
    public async start(): Promise<void> {
        await this.certificates.start();
    }

    /** Closes every browser connection and stops renewals. */
    public stop(): void {
        this.certificates.stop();
        this.terminator.close();
        this.http.close();
        this.http.closeAllConnections();
    }

    /** A tunnel became ready (ACME may order now). */
    public tunnelBecameReady(): void {
        this.certificates.tunnelBecameReady();
    }

    /** Whether browsers can open the engine now (a valid certificate for its hostname). */
    public get servesBrowsers(): boolean {
        return this.certificates.credentials(this.options.hostname) !== undefined;
    }

    /** The certificate state for the App page. */
    public certificateView(): CertificateView {
        return this.certificates.view();
    }

    /** Takes one browser stream from a relay. */
    public handleStream(stream: TunnelStream): void {
        this.terminator.handle(stream, { address: stream.peer.address, port: stream.peer.port });
    }

    /** Hands a TLS connection to the HTTP server, remembering its client address and hostname. */
    private accept(socket: TLSSocket, info: SecureConnectionInfo): void {
        this.connections.set(socket, info);
        this.http.emit('connection', socket);
    }

    /** One HTTP request through the gateway. */
    private async serve(request: IncomingMessage, response: ServerResponse): Promise<void> {
        const info = this.connections.get(request.socket);
        const abort = new AbortController();
        response.once('close', () => abort.abort());
        try {
            if (!info) throw new Error('unknown connection');
            const answer = await this.gateway.handle(webRequest(request, abort.signal), info);
            await writeResponse(answer, response, request.method ?? 'GET');
        } catch (error) {
            this.options.log?.(`A browser request failed: ${errorMessage(error)}`, 'warning');
            if (!response.headersSent) await writeResponse(withSecurityHeaders(contractProblem('internal-error')), response, 'GET').catch(() => response.destroy());
            else response.destroy();
        }
    }
}
