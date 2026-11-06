import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'node:dns';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { connect as netConnect, type Socket } from 'node:net';
import { connect as tlsConnect, type ConnectionOptions, type TLSSocket } from 'node:tls';

/**
 * TLS options only tests inject (a test CA in place of the system roots). Production code never passes them: an extra
 * CA comes from `NODE_EXTRA_CA_CERTS`, which adds to the default roots instead of replacing them.
 *
 * @private App connection
 */
export type TestTlsOptions = Pick<ConnectionOptions, 'ca'>;

/**
 * Where and how to open one outbound TLS connection.
 *
 * @private App connection
 */
export type TlsTarget = {
    readonly host: string;
    readonly port: number;
    /** ALPN protocols to offer. */
    readonly alpn?: readonly string[];
    readonly env: NodeJS.ProcessEnv;
    /** Bound on TCP, proxy and TLS setup. */
    readonly timeoutMs: number;
    readonly tls?: TestTlsOptions;
};

/**
 * Why an outbound connection failed, for the App page (never with credentials).
 *
 * @private App connection
 */
export class ConnectFailure extends Error {
    public constructor(
        public readonly kind: 'network' | 'proxy' | 'tls' | 'timeout' | 'upgrade',
        message: string,
    ) {
        super(message);
        this.name = 'ConnectFailure';
    }
}

/**
 * Resolves names under `localhost` to loopback itself (RFC 6761), so development and tests do not depend on how the
 * platform resolver treats `*.localhost`.
 */
function loopbackAwareLookup(hostname: string, options: LookupOptions, callback: (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void): void {
    const name = hostname.toLowerCase();
    if (name === 'localhost' || name.endsWith('.localhost')) {
        if (options.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
        else callback(null, '127.0.0.1', 4);
        return;
    }
    dnsLookup(hostname, options, callback as never);
}

/**
 * The proxy for a host from `HTTPS_PROXY`/`https_proxy`, unless `NO_PROXY`/`no_proxy` exempts it.
 *
 * @private App connection
 */
export function proxyFor(host: string, port: number, env: NodeJS.ProcessEnv): URL | undefined {
    const value = env.HTTPS_PROXY || env.https_proxy;
    if (!value) return undefined;
    const exemptions = (env.NO_PROXY || env.no_proxy || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    const name = host.toLowerCase();
    for (const exemption of exemptions) {
        if (exemption === '*') return undefined;
        const [pattern, exemptPort] = exemption.split(':') as [string, string | undefined];
        if (exemptPort && Number(exemptPort) !== port) continue;
        const suffix = pattern.replace(/^\*?\./, '');
        if (name === suffix || name.endsWith(`.${suffix}`)) return undefined;
    }
    try {
        const url = new URL(value.includes('://') ? value : `http://${value}`);
        return url.protocol === 'http:' ? url : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Opens a TCP tunnel through an HTTP proxy with `CONNECT` (basic authentication from the proxy URL).
 */
async function connectThroughProxy(proxy: URL, host: string, port: number, deadline: number): Promise<Socket> {
    const socket = netConnect({ host: proxy.hostname, port: Number(proxy.port || 80), lookup: loopbackAwareLookup as never });
    const authorization = proxy.username ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64')}\r\n` : '';
    return await new Promise<Socket>((resolve, reject) => {
        let buffered = Buffer.alloc(0);
        const timer = setTimeout(() => fail(new ConnectFailure('timeout', 'The proxy did not answer in time.')), Math.max(1, deadline - Date.now()));
        const fail = (error: Error): void => {
            clearTimeout(timer);
            socket.destroy();
            reject(error);
        };
        socket.once('error', () => fail(new ConnectFailure('proxy', 'The proxy could not be reached.')));
        socket.once('connect', () => socket.write(`CONNECT ${host}:${String(port)} HTTP/1.1\r\nHost: ${host}:${String(port)}\r\n${authorization}\r\n`));
        const onData = (chunk: Buffer): void => {
            buffered = Buffer.concat([buffered, chunk]);
            const end = buffered.indexOf('\r\n\r\n');
            if (end < 0) {
                if (buffered.length > 16_384) fail(new ConnectFailure('proxy', 'The proxy sent an oversized answer.'));
                return;
            }
            socket.off('data', onData);
            const status = Number(/^HTTP\/1\.[01] (\d{3})/.exec(buffered.subarray(0, end).toString('latin1'))?.[1] ?? 0);
            if (status < 200 || status > 299) {
                fail(new ConnectFailure('proxy', `The proxy refused the connection (HTTP ${String(status || 'unknown')}).`));
                return;
            }
            clearTimeout(timer);
            socket.removeAllListeners('error');
            const rest = buffered.subarray(end + 4);
            if (rest.length) socket.unshift(rest);
            resolve(socket);
        };
        socket.on('data', onData);
    });
}

/**
 * Opens a verified TLS connection to `host:port`, through the configured proxy when one applies. The certificate is
 * checked for `host` against the default roots (plus `NODE_EXTRA_CA_CERTS`).
 *
 * @private App connection
 */
export async function openTls(target: TlsTarget): Promise<TLSSocket> {
    const deadline = Date.now() + target.timeoutMs;
    const proxy = proxyFor(target.host, target.port, target.env);
    const socket = proxy ? await connectThroughProxy(proxy, target.host, target.port, deadline) : undefined;
    return await new Promise<TLSSocket>((resolve, reject) => {
        const tls = tlsConnect({
            ...(socket ? { socket } : { host: target.host, port: target.port, lookup: loopbackAwareLookup as never }),
            servername: target.host,
            ...(target.alpn ? { ALPNProtocols: [...target.alpn] } : {}),
            ...(target.tls ?? {}),
        });
        const timer = setTimeout(() => fail(new ConnectFailure('timeout', 'The connection timed out.')), Math.max(1, deadline - Date.now()));
        const fail = (error: Error): void => {
            clearTimeout(timer);
            tls.destroy();
            reject(error);
        };
        tls.once('secureConnect', () => {
            clearTimeout(timer);
            tls.removeAllListeners('error');
            resolve(tls);
        });
        tls.once('error', (error: NodeJS.ErrnoException) => {
            const code = String(error.code ?? '');
            const certificate = /CERT|SELF_SIGNED|ALTNAME|UNABLE_TO|ERR_TLS|SSL/.test(code);
            fail(new ConnectFailure(certificate ? 'tls' : 'network', certificate ? `The certificate was refused (${code}).` : `The connection failed${code ? ` (${code})` : ''}.`));
        });
    });
}

/**
 * One bounded HTTPS answer.
 *
 * @private App connection
 */
export type HttpsResponse = {
    readonly status: number;
    readonly headers: IncomingHttpHeaders;
    readonly body: Buffer;
};

/**
 * Sends one HTTPS request over `openTls` (so it honours the proxy settings) and reads at most `maxResponseBytes`. An
 * answer over the cap is refused as a whole.
 *
 * @private App connection
 */
export async function httpsRequest(input: {
    readonly url: string;
    readonly method: 'GET' | 'POST';
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: Uint8Array;
    readonly maxResponseBytes: number;
    readonly timeoutMs: number;
    readonly env: NodeJS.ProcessEnv;
    readonly tls?: TestTlsOptions;
}): Promise<HttpsResponse> {
    const url = new URL(input.url);
    const port = Number(url.port || 443);
    const deadline = Date.now() + input.timeoutMs;
    const socket = await openTls({ host: url.hostname, port, alpn: ['http/1.1'], env: input.env, timeoutMs: input.timeoutMs, tls: input.tls });
    return await new Promise<HttpsResponse>((resolve, reject) => {
        const request = httpRequest({
            method: input.method,
            path: `${url.pathname}${url.search}`,
            setHost: false,
            headers: { host: url.host, ...(input.body ? { 'content-length': String(input.body.length) } : {}), ...input.headers },
            createConnection: () => socket,
        });
        const timer = setTimeout(() => {
            request.destroy(new ConnectFailure('timeout', 'The request timed out.'));
        }, Math.max(1, deadline - Date.now()));
        request.once('error', (error) => {
            clearTimeout(timer);
            socket.destroy();
            reject(error instanceof ConnectFailure ? error : new ConnectFailure('network', 'The request failed.'));
        });
        request.once('response', (response) => {
            const chunks: Buffer[] = [];
            let size = 0;
            response.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > input.maxResponseBytes) {
                    clearTimeout(timer);
                    response.destroy();
                    socket.destroy();
                    reject(new ConnectFailure('network', 'The answer exceeded its size limit.'));
                    return;
                }
                chunks.push(chunk);
            });
            response.once('end', () => {
                clearTimeout(timer);
                socket.end();
                resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) });
            });
            response.once('error', () => {
                clearTimeout(timer);
                socket.destroy();
                reject(new ConnectFailure('network', 'The answer was cut off.'));
            });
        });
        request.end(input.body ? Buffer.from(input.body) : undefined);
    });
}
