import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { PtbkError, errorMessage } from '../common/errors.js';
import { engineModule } from '../common/version.js';
import type { Agenda } from '../engine/agenda.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import { applyAnswer, applyControlAction, applySettings } from './actions.js';
import type { AuthStore, SessionRecord } from './auth.js';

/**
 * First port tried when none is configured.
 *
 * @private local HTTP server
 */
export const DEFAULT_PORT = 3000;

/**
 * Number of consecutive ports tried automatically.
 */
const PORT_SEARCH_RANGE = 100;

/**
 * Upper bound of one long-poll request (stays below tunnel/proxy idle limits).
 */
const LONG_POLL_MS = 25_000;

/**
 * Maximal JSON request body.
 */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * Static assets of the browser dashboard (served from the installation).
 */
const STATIC_FILES: Readonly<Record<string, string>> = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/assets/app.js': 'app.js',
    '/assets/app.css': 'app.css',
    '/assets/icon.svg': 'icon.svg',
};

/**
 * Content types of static assets.
 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
    html: 'text/html; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    svg: 'image/svg+xml',
};

/**
 * Security headers on every response.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Inputs of the HTTP server.
 *
 * @private local HTTP server
 */
export type HttpServerOptions = {
    readonly agenda: Agenda;
    readonly auth: AuthStore;
    /** Requested port (exact) or undefined for automatic search from 3000. */
    readonly port?: number;
    /** Non-secret identifier used to verify that a public endpoint reaches this service. */
    readonly publicInstance: string;
    /** Public base URL when remote access is ready. */
    readonly publicUrl: () => string | undefined;
    /** Called after a pairing capability was consumed. */
    readonly onPairingChanged?: () => void;
};

/**
 * A running HTTP server.
 *
 * @private local HTTP server
 */
export type RunningHttpServer = { readonly port: number; readonly url: string; readonly close: () => Promise<void> };

/**
 * Listens on loopback; with an explicit port a conflict is an error, otherwise the next free port is used.
 */
async function listen(server: Server, port: number | undefined): Promise<number> {
    const candidates = port !== undefined ? [port] : Array.from({ length: PORT_SEARCH_RANGE }, (_, index) => DEFAULT_PORT + index);
    let lastError: unknown;
    for (const candidate of candidates) {
        try {
            await new Promise<void>((resolve, reject) => {
                const onError = (error: Error): void => {
                    server.off('listening', onListening);
                    reject(error);
                };
                const onListening = (): void => {
                    server.off('error', onError);
                    resolve();
                };
                server.once('error', onError);
                server.once('listening', onListening);
                server.listen(candidate, '127.0.0.1');
            });
            return candidate;
        } catch (error) {
            lastError = error;
            if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') break;
        }
    }
    if (port !== undefined) {
        throw new PtbkError(`Port ${port} is not available.`, { kind: 'conflict', reason: errorMessage(lastError), next: ['Choose another `--port`, or omit it for automatic selection.'] });
    }
    throw new PtbkError('No free local port was found for the dashboard.', { kind: 'technical', reason: errorMessage(lastError), next: ['Pass `--port <port>` or `--no-server`.'] });
}

/**
 * Reads a JSON request body (bounded).
 */
async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        size += (chunk as Buffer).length;
        if (size > MAX_BODY_BYTES) throw new PtbkError('Request body too large.', { kind: 'usage' });
        chunks.push(chunk as Buffer);
    }
    if (!chunks.length) return {};
    try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    } catch {
        throw new PtbkError('Invalid JSON body.', { kind: 'usage' });
    }
}

/**
 * Parses a cookie header.
 */
function cookies(request: IncomingMessage): Record<string, string> {
    const result: Record<string, string> = {};
    for (const part of (request.headers.cookie ?? '').split(';')) {
        const index = part.indexOf('=');
        if (index > 0) result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    }
    return result;
}

/**
 * Sends JSON without caching.
 */
function sendJson(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
    response.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', Pragma: 'no-cache', ...headers });
    response.end(JSON.stringify(body));
}

/**
 * Removes anything that must not leave the trusted local terminal (pairing secrets).
 *
 * @private local HTTP server
 */
export function publicSnapshot(snapshot: ServiceSnapshot): ServiceSnapshot {
    return { ...snapshot, connection: { ...snapshot.connection, pairing: snapshot.connection.pairing ? { available: snapshot.connection.pairing.available } : undefined } };
}

/**
 * Starts the loopback HTTP server serving the SPA shell and the authenticated service API.
 *
 * @private local HTTP server
 */
export async function startHttpServer(options: HttpServerOptions): Promise<RunningHttpServer> {
    const { agenda, auth } = options;
    const spaDirectory = engineModule('service/spa');
    const server = createServer((request, response) => {
        void handle(request, response).catch((error: unknown) => {
            if (response.headersSent) {
                response.end();
                return;
            }
            const status = error instanceof PtbkError ? (error.details.kind === 'usage' ? 400 : error.details.kind === 'conflict' ? 409 : error.details.kind === 'not-found' ? 404 : 500) : 500;
            sendJson(response, status, { error: errorMessage(error), next: error instanceof PtbkError ? error.details.next : undefined });
        });
    });
    server.keepAliveTimeout = 5000;
    server.headersTimeout = 30_000;

    /** Resolves the authenticated principal of a request. */
    const principal = async (request: IncomingMessage): Promise<{ kind: 'session'; session: SessionRecord } | { kind: 'token' } | undefined> => {
        const authorization = request.headers.authorization;
        if (authorization?.startsWith('Bearer ')) return (await auth.authenticateApiToken(authorization.slice(7).trim())) ? { kind: 'token' } : undefined;
        const session = await auth.authenticateSession(cookies(request).ptbk_session);
        return session ? { kind: 'session', session } : undefined;
    };

    /** Rejects cross-origin and CSRF-less cookie mutations. */
    const assertSameOrigin = (request: IncomingMessage, who: { kind: 'session'; session: SessionRecord } | { kind: 'token' }): void => {
        if (who.kind === 'token') return;
        const origin = request.headers.origin;
        const host = request.headers['x-forwarded-host'] ?? request.headers.host;
        if (origin) {
            let originHost: string;
            try {
                originHost = new URL(origin).host;
            } catch {
                throw new PtbkError('Cross-origin request rejected.', { kind: 'conflict' });
            }
            if (originHost !== host) throw new PtbkError('Cross-origin request rejected.', { kind: 'conflict' });
        }
        if (request.headers['x-ptbk-csrf'] !== who.session.csrf) throw new PtbkError('Missing or invalid CSRF token.', { kind: 'conflict' });
    };

    const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const method = request.method ?? 'GET';
        const asset = STATIC_FILES[url.pathname];
        if (method === 'GET' && asset) {
            const content = await readFile(join(spaDirectory, asset));
            const extension = asset.split('.').pop()!;
            response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': CONTENT_TYPES[extension]!, 'Cache-Control': asset === 'index.html' ? 'no-store' : 'private, max-age=300' });
            response.end(content);
            return;
        }
        if (!url.pathname.startsWith('/api/')) {
            sendJson(response, 404, { error: 'Not found.' });
            return;
        }
        if (url.pathname === '/api/health' && method === 'GET') {
            sendJson(response, 200, { service: 'ptbk', instance: options.publicInstance });
            return;
        }
        if (url.pathname === '/api/pair' && method === 'POST') {
            const body = await readJsonBody(request);
            const result = await auth.redeemPairing(String(body.code ?? ''), String(request.headers['user-agent'] ?? 'browser'));
            if ('error' in result) {
                sendJson(response, 401, { error: result.error });
                return;
            }
            const secure = request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
            sendJson(response, 200, { ok: true, csrf: result.session.csrf }, { 'Set-Cookie': `ptbk_session=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30 * 86_400}${secure}` });
            agenda.log(`A device paired for remote access (${result.session.id}).`);
            options.onPairingChanged?.();
            return;
        }
        const who = await principal(request);
        if (url.pathname === '/api/session' && method === 'GET') {
            sendJson(response, 200, who ? { authenticated: true, csrf: who.kind === 'session' ? who.session.csrf : undefined } : { authenticated: false });
            return;
        }
        if (!who) {
            sendJson(response, 401, { error: 'Authentication required. Pair this device from the local terminal (ptbk access pair).' });
            return;
        }
        if (url.pathname === '/api/logout' && method === 'POST') {
            assertSameOrigin(request, who);
            if (who.kind === 'session') await auth.revokeSessions(who.session.id);
            sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'ptbk_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
            return;
        }
        if (url.pathname === '/api/state' && method === 'GET') {
            const after = Number(url.searchParams.get('after') ?? NaN);
            if (Number.isFinite(after)) await agenda.waitForChange(after, Math.min(LONG_POLL_MS, Number(url.searchParams.get('wait') ?? LONG_POLL_MS)));
            sendJson(response, 200, publicSnapshot(agenda.snapshot()));
            return;
        }
        if (url.pathname === '/api/qr' && method === 'GET') {
            const target = options.publicUrl() ?? `http://${request.headers.host ?? '127.0.0.1'}/`;
            const svg = await QRCode.toString(target, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
            response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store, private' });
            response.end(svg);
            return;
        }
        if (method !== 'POST') {
            sendJson(response, 405, { error: 'Method not allowed.' });
            return;
        }
        assertSameOrigin(request, who);
        const body = await readJsonBody(request);
        if (url.pathname === '/api/control') {
            sendJson(response, 200, applyControlAction(agenda, String(body.action ?? '')));
            return;
        }
        const answerMatch = /^\/api\/requests\/(r-[a-z0-9]+)\/answer$/.exec(url.pathname);
        if (answerMatch) {
            const resolved = await applyAnswer(agenda, { ...body, id: answerMatch[1] }, who.kind === 'token' ? 'api' : 'browser');
            sendJson(response, 200, { id: resolved.id, status: resolved.status });
            return;
        }
        if (url.pathname === '/api/settings') {
            sendJson(response, 200, await applySettings(agenda, body));
            return;
        }
        sendJson(response, 404, { error: 'Not found.' });
    };

    const port = await listen(server, options.port);
    return {
        port,
        url: `http://127.0.0.1:${port}/`,
        close: async () => {
            server.closeAllConnections?.();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        },
    };
}
