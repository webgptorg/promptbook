import { createServer, type IncomingMessage } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import type { Workspace } from './domain.js';
import type { RuntimeControl } from './service.js';
import { dashboardPage } from './dashboard-page.js';
import { DashboardAccess } from './dashboard-access.js';
import { ManagedTunnel, validateTunnelOptions, type TunnelOptions, type TunnelDependencies } from './tunnel.js';
import { InputError } from './workspace.js';
import { redactSecrets } from './harness.js';

/** Bounded project API bodies are parsed independently of browser rendering. */
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
    let bytes = 0; const chunks: Buffer[] = [];
    for await (const chunk of request) { const part = Buffer.from(chunk); bytes += part.length; if (bytes > 256 * 1024) throw new InputError('Control body exceeds 256 KiB.'); chunks.push(part); }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Control body must be an object.');
    return value as Record<string, unknown>;
}
/** The process's explicit API token is never embedded in a browser URL. */
function matches(actual: unknown, expected: string): boolean { return typeof actual === 'string' && Buffer.byteLength(actual) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
/** Strip sensitive presentation additions even when a client supplied a decorated snapshot. */
function publicState(value: Record<string, unknown>): Record<string, unknown> {
    const { pairingUrl: _pairingUrl, token: _token, ...state } = value;
    if (typeof state.url === 'string') state.url = state.url.split('#')[0];
    return state;
}
/** Protected dashboard lifecycle and trusted-local access controls. @private */
export interface DashboardServer {
    url: string; readonly sessionUrl: string;
    connection(): Record<string, unknown>; trustedConnection(): Record<string, unknown>;
    trustedCommand(action: string, input?: Record<string, unknown>): Promise<unknown>;
    startTunnel(): Promise<void>; close(): Promise<void>;
}
/** Bind loopback and establish project protection before optionally publishing a verified HTTPS endpoint. @private */
export async function openDashboard(workspace: Workspace, control: RuntimeControl, selectedPort?: number,
    options: TunnelOptions = { noTunnel: true }, dependencies: TunnelDependencies = {}): Promise<DashboardServer> {
    validateTunnelOptions(options);
    if (selectedPort !== undefined && (!Number.isInteger(selectedPort) || selectedPort < 1 || selectedPort > 65535)) throw new InputError('--port must be between 1 and 65535.');
    const access = await DashboardAccess.open(workspace);
    if (options.noTunnel) await access.revokeRemoteDevices();
    let port = selectedPort ?? 3000; let remoteOrigin: string | undefined; let tunnel: ManagedTunnel;
    const nonce = randomUUID(); const challenge = randomUUID();
    let failures = 0; let failureWindow = Date.now();
    /** Rate-limit failed authentication globally, independent of untrusted forwarded IP headers. */
    const limited = (): boolean => { if (Date.now() - failureWindow > 60_000) { failureWindow = Date.now(); failures = 0; } return failures >= 30; };
    /** Ordinary connection telemetry never contains a pairing capability or a credential. */
    const connection = (): Record<string, unknown> => ({ localUrl: `http://127.0.0.1:${port}`, remote: { ...tunnel.state }, pairing: access.status(),
        url: tunnel.state.url ?? `http://127.0.0.1:${port}`, guidance: tunnel.state.status === 'ready' ? 'Cloudflare relays this connection. HTTPS does not hide content from the relay. Pair from a trusted local terminal.' : 'Same-computer access. Remote access is disabled, connecting or degraded.' });
    /** Trusted local clients may inspect the current link without generating another capability. */
    const trustedConnection = (): Record<string, unknown> => ({ ...connection(), pairingUrl: access.link(tunnel.state.url ?? `http://127.0.0.1:${port}`) });
    const server = createServer((request, response) => {
        response.setHeader('Cache-Control', 'private, no-store, max-age=0'); response.setHeader('Pragma', 'no-cache');
        response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer');
        /** Return redacted structured observations without leaking credentials in ordinary responses. */
        const respond = (code: number, value: unknown) => { if (response.headersSent) return; response.writeHead(code, { 'Content-Type': 'application/json' }); response.end(redactSecrets(JSON.stringify(value), workspace.projectPath)); };
        void (async () => {
            const localOrigin = `http://127.0.0.1:${port}`;
            const origin = request.headers.host === new URL(localOrigin).host ? localOrigin : remoteOrigin && request.headers.host === new URL(remoteOrigin).host ? remoteOrigin : undefined;
            if (!origin || request.headers.origin && request.headers.origin !== origin || request.headers['sec-fetch-site'] === 'cross-site') return respond(403, { error: 'Invalid host/origin.' });
            const url = new URL(request.url || '/', origin);
            if (url.search || url.hash) return respond(400, { error: 'Credentials and API parameters must not be supplied in URLs.' });
            if (request.method === 'GET' && url.pathname === '/') {
                response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` }); response.end(dashboardPage(nonce)); return;
            }
            if (request.method === 'GET' && url.pathname === '/api/health') { response.writeHead(200, { 'Content-Type': 'text/plain' }); response.end(challenge); return; }
            if (request.method === 'POST' && url.pathname === '/api/pair') {
                if (limited()) { response.setHeader('Retry-After', '60'); return respond(429, { error: 'Too many authentication attempts; retry in one minute.' }); }
                if (request.headers.origin !== origin || !request.headers['content-type']?.startsWith('application/json')) return respond(403, { error: 'Same-origin JSON pairing required.' });
                try {
                    const session = await access.redeem((await body(request)).capability, origin);
                    response.setHeader('Set-Cookie', `${access.cookieName()}=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${origin.startsWith('https:') ? '; Secure' : ''}`);
                    return respond(200, { paired: true, expiresAt: session.expiresAt });
                } catch (error) { failures++; throw error; }
            }
            const bearer = request.headers.authorization?.replace(/^Bearer /, '') ?? request.headers['x-ptbk-token'];
            const direct = access.authenticate(bearer, 'api') || origin === localOrigin && matches(bearer, control.token);
            const cookieName = access.cookieName();
            const cookie = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
            if (!direct && !access.authenticate(cookie, 'device', origin)) {
                if (limited()) { response.setHeader('Retry-After', '60'); return respond(429, { error: 'Too many authentication attempts; retry in one minute.' }); }
                failures++; return respond(403, { error: 'Pair from the trusted local terminal, or supply an issued project API credential.' });
            }
            if (request.method !== 'GET' && (request.headers.origin && request.headers.origin !== origin || !direct && request.headers.origin !== origin || !request.headers['content-type']?.startsWith('application/json'))) return respond(403, { error: 'Same-origin JSON control required; direct API clients may use a bearer credential.' });
            if (request.method === 'GET' && url.pathname === '/api/state') return respond(200, { ...publicState(await control.snapshot()), ...connection() });
            if (request.method === 'GET' && url.pathname === '/api/connection') {
                const info = connection(); const { modules } = QRCode.create(String(info.url));
                return respond(200, { ...info, size: modules.size, modules: Array.from(modules.data) });
            }
            if (request.method === 'POST' && url.pathname === '/api/control') {
                const input = await body(request);
                if (typeof input.action !== 'string') throw new InputError('A control action is required.');
                if (['connection', 'pair-renew', 'access-devices', 'access-revoke', 'api-token'].includes(input.action)) return respond(403, { error: 'Access management requires the trusted local control channel.' });
                return respond(200, await control.command(input.action, input));
            }
            if (request.method === 'POST' && url.pathname === '/api/task') return respond(200, await control.command('edit-task', await body(request)));
            return respond(404, { error: 'Route not found.' });
        })().catch(error => respond(error instanceof InputError || error instanceof SyntaxError ? 400 : 409, { error: (error as Error).message }));
    });
    server.requestTimeout = 15_000;
    for (;;) {
        try {
            await new Promise<void>((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); accept(); }); }); break;
        } catch (error) { if (!selectedPort && (error as NodeJS.ErrnoException).code === 'EADDRINUSE' && port < 65535) port++; else throw new Error(`Cannot listen on localhost:${port}: ${(error as Error).message}`); }
    }
    const localUrl = `http://127.0.0.1:${port}`;
    tunnel = new ManagedTunnel(workspace, options, localUrl, challenge, origin => { remoteOrigin = origin; }, dependencies);
    let closed = false;
    return { url: localUrl, get sessionUrl() { return access.link(tunnel.state.url ?? localUrl) ?? `${tunnel.state.url ?? localUrl}/`; }, connection,
        trustedConnection,
        async trustedCommand(action, input = {}) {
            if (action === 'connection') return trustedConnection();
            if (action === 'pair-renew') { await access.renew(); return trustedConnection(); }
            if (action === 'access-devices') return access.devices();
            if (action === 'access-revoke') { if (input.id !== undefined && typeof input.id !== 'string') throw new InputError('Device id must be a string.'); await access.revoke(input.id as string | undefined); return { revoked: true }; }
            if (action === 'api-token') return access.issueApi();
            throw new InputError('Unknown access control.');
        }, startTunnel: () => tunnel.start(), async close() {
            if (closed) return; closed = true; await tunnel.close();
            await new Promise<void>((accept, reject) => { const timeout = setTimeout(() => server.closeAllConnections(), 2000); server.close(error => { clearTimeout(timeout); if (error) reject(error); else accept(); }); server.closeIdleConnections(); });
        } };
}
