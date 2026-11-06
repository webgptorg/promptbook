import type { Duplex } from 'node:stream';
import { createSecureContext, createServer, type SecureContext, type TLSSocket } from 'node:tls';
import { protocol, type ClientHelloParse } from '../../vendor/app-platform.js';
import { parseHostname } from '../identity.js';
import type { TlsCredentials } from './x509.js';

/**
 * The only protocol a TLS-ALPN-01 validation server offers (RFC 8737).
 *
 * @private App web origin
 */
export const ACME_TLS_ALPN_PROTOCOL = 'acme-tls/1';

/**
 * The relay's own ClientHello limit: a hello it would not route is not one the engine waits for either.
 */
const CLIENT_HELLO_MAX_BYTES = 16_384;

/**
 * Bound on reading the ClientHello and on the TLS handshake (the relay resets a stream that stays silent for about
 * 10 s after `OPEN`).
 *
 * @private App web origin
 */
export const HANDSHAKE_TIMEOUT_MS = 10_000;

/**
 * The browser's address from the tunnel's `OPEN` frame.
 *
 * @private App web origin
 */
export type StreamPeer = { readonly address: string; readonly port: number };

/**
 * What the HTTP layer knows about one browser connection.
 *
 * @private App web origin
 */
export type SecureConnectionInfo = {
    /** The SNI the certificate was chosen for. */
    readonly hostname: string;
    /** The browser's address as the relay saw it (never `X-Forwarded-For`). */
    readonly clientIp: string;
};

/**
 * What answers one stream, decided from its ClientHello alone.
 *
 * @private App web origin
 */
export type HelloDecision = { readonly kind: 'normal' } | { readonly kind: 'acme-challenge'; readonly hostname: string } | { readonly kind: 'reject'; readonly reason: 'no-pending-challenge' | 'acme-alpn-mixed' | 'acme-without-sni' | 'malformed' | 'too-large' };

/**
 * Only a hello offering exactly `acme-tls/1` for a hostname with a challenge pending reaches the challenge responder;
 * any other `acme-tls/1` hello is refused, so outside an issuance the engine never acts as a TLS-ALPN-01 endpoint.
 * Everything else goes to the normal TLS server, which refuses names it holds no certificate for.
 *
 * @private App web origin
 */
export function decideHello(hello: Exclude<ClientHelloParse, { readonly kind: 'need-more' }>, hasPendingChallenge: (hostname: string) => boolean): HelloDecision {
    switch (hello.kind) {
        case 'malformed':
            return { kind: 'reject', reason: 'malformed' };
        case 'too-large':
            return { kind: 'reject', reason: 'too-large' };
        case 'no-sni':
            return hello.alpn.includes(ACME_TLS_ALPN_PROTOCOL) ? { kind: 'reject', reason: 'acme-without-sni' } : { kind: 'normal' };
        case 'sni': {
            if (!hello.alpn.includes(ACME_TLS_ALPN_PROTOCOL)) return { kind: 'normal' };
            if (hello.alpn.length !== 1) return { kind: 'reject', reason: 'acme-alpn-mixed' };
            const hostname = parseHostname(hello.hostname);
            if (!hostname || !hasPendingChallenge(hostname)) return { kind: 'reject', reason: 'no-pending-challenge' };
            return { kind: 'acme-challenge', hostname };
        }
    }
}

/**
 * Reads a stream until its ClientHello parses (or cannot), then puts every byte back with `unshift`, so whoever takes
 * the stream next sees it untouched.
 */
function peekClientHello(stream: Duplex, done: (outcome: Exclude<ClientHelloParse, { readonly kind: 'need-more' }> | { readonly kind: 'timeout' } | { readonly kind: 'ended' }) => void): void {
    const buffer = protocol.createClientHelloBuffer({ maxBytes: CLIENT_HELLO_MAX_BYTES });
    let finished = false;
    const finish = (outcome: Parameters<typeof done>[0]): void => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        stream.off('readable', onReadable);
        stream.off('end', onEnded);
        stream.off('close', onEnded);
        done(outcome);
    };
    const onEnded = (): void => finish({ kind: 'ended' });
    const onReadable = (): void => {
        for (let chunk = stream.read() as Buffer | null; chunk !== null; chunk = stream.read() as Buffer | null) {
            const parse = buffer.push(chunk);
            if (parse.kind !== 'need-more') {
                stream.unshift(Buffer.from(buffer.bytes()));
                finish(parse);
                return;
            }
        }
    };
    const timer = setTimeout(() => finish({ kind: 'timeout' }), HANDSHAKE_TIMEOUT_MS);
    timer.unref();
    stream.on('readable', onReadable);
    stream.once('end', onEnded);
    stream.once('close', onEnded);
}

/**
 * A handshake refusal for a server name the engine holds nothing for.
 */
class UnknownServerNameError extends Error {
    public readonly code = 'ERR_UNKNOWN_SERVER_NAME';
}

/**
 * Ends browser TLS inside tunnel streams with keys only the engine holds: a ClientHello router in front of the normal
 * TLS server (TLS 1.3 only, certificate by SNI, no default certificate) and the TLS-ALPN-01 challenge responder. Each
 * stream gets its own never-listening `tls.Server`, so a connection keeps its `OPEN` frame's client address; all of
 * them share the secure contexts, so a renewal applies to the next connection.
 *
 * @private App web origin
 */
export class TlsTerminator {
    private readonly contexts = new WeakMap<TlsCredentials, SecureContext>();
    private readonly live = new Set<Duplex>();
    private closed = false;

    public constructor(
        private readonly options: {
            /** The served certificate for a hostname, if any. */
            readonly credentials: (hostname: string) => TlsCredentials | undefined;
            /** The pending TLS-ALPN-01 challenge certificate for a hostname, if any. */
            readonly challenge: (hostname: string) => TlsCredentials | undefined;
            /** Receives each connection after a successful handshake; it owns the socket from then on. */
            readonly onSecureConnection: (socket: TLSSocket, info: SecureConnectionInfo) => void;
            readonly log?: (text: string) => void;
        },
    ) {}

    /** Connections not yet closed. */
    public get connections(): number {
        return [...this.live].filter((stream) => !stream.destroyed).length;
    }

    /** One secure context per credentials object. */
    private contextFor(credentials: TlsCredentials): SecureContext {
        let context = this.contexts.get(credentials);
        if (!context) {
            context = createSecureContext({ cert: credentials.certificatePem, key: credentials.keyPem, minVersion: 'TLSv1.3' });
            this.contexts.set(credentials, context);
        }
        return context;
    }

    /** Takes one tunnel stream (or any duplex standing in for one). */
    public handle(stream: Duplex, peer: StreamPeer): void {
        stream.on('error', () => undefined);
        if (this.closed) {
            stream.destroy();
            return;
        }
        this.live.add(stream);
        stream.once('close', () => this.live.delete(stream));
        peekClientHello(stream, (hello) => {
            if (hello.kind === 'timeout' || hello.kind === 'ended') {
                stream.destroy();
                return;
            }
            const decision = decideHello(hello, (hostname) => this.options.challenge(hostname) !== undefined);
            if (decision.kind === 'reject') {
                // A refused acme-tls/1 hello gets no byte at all (RFC 8737).
                this.options.log?.(`A browser stream was refused (${decision.reason}).`);
                stream.destroy();
            } else if (decision.kind === 'acme-challenge') this.answerChallenge(stream, decision.hostname);
            else this.terminate(stream, peer);
        });
    }

    /** The normal TLS server for one stream. */
    private terminate(stream: Duplex, peer: StreamPeer): void {
        let socket: TLSSocket | undefined;
        stream.once('close', () => socket?.destroy());
        const server = createServer({
            minVersion: 'TLSv1.3',
            ALPNProtocols: ['http/1.1'],
            handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
            SNICallback: (servername, callback) => {
                const hostname = parseHostname(servername);
                const credentials = hostname ? this.options.credentials(hostname) : undefined;
                if (!credentials) callback(new UnknownServerNameError('no certificate for this server name'));
                else callback(null, this.contextFor(credentials));
            },
        });
        server.once('tlsClientError', (error: Error, failed: TLSSocket) => {
            this.options.log?.(`A browser TLS handshake failed: ${(error as NodeJS.ErrnoException).code ?? error.message}.`);
            failed.destroy();
            stream.destroy();
        });
        server.once('secureConnection', (secured: TLSSocket) => {
            socket = secured;
            secured.once('close', () => stream.destroy());
            const hostname = parseHostname(secured.servername);
            if (!hostname) {
                secured.destroy();
                return;
            }
            this.options.onSecureConnection(secured, { hostname, clientIp: peer.address });
        });
        server.emit('connection', stream);
    }

    /** The TLS-ALPN-01 responder: the challenge certificate, the handshake, then the connection closes. */
    private answerChallenge(stream: Duplex, hostname: string): void {
        const server = createServer({
            minVersion: 'TLSv1.2',
            ALPNProtocols: [ACME_TLS_ALPN_PROTOCOL],
            handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
            SNICallback: (servername, callback) => {
                const credentials = parseHostname(servername) === hostname ? this.options.challenge(hostname) : undefined;
                if (!credentials) callback(new UnknownServerNameError('no challenge pending for this server name'));
                else callback(null, createSecureContext({ cert: credentials.certificatePem, key: credentials.keyPem }));
            },
        });
        server.once('tlsClientError', (_error: Error, failed: TLSSocket) => {
            failed.destroy();
            stream.destroy();
        });
        server.once('secureConnection', (socket: TLSSocket) => {
            this.options.log?.(`Answered the certificate authority's TLS-ALPN-01 validation for ${hostname}.`);
            socket.once('close', () => stream.destroy());
            socket.end();
        });
        server.emit('connection', stream);
    }

    /** Destroys every connection; later streams are destroyed on arrival. */
    public close(): void {
        this.closed = true;
        for (const stream of [...this.live]) stream.destroy();
    }
}
