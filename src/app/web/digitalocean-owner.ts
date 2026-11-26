import { createHash, randomBytes } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { isEngineId } from '../identity.js';

/** Only the fresh Droplet's root-owned bootstrap opts an engine in. */
const MARKERS = '/etc/promptbook/digitalocean-first-owner';
/** Fixed provider endpoints. */
const OAUTH = 'https://cloud.digitalocean.com/v1/oauth';
const CALLBACK = '/setup/digitalocean/callback';
const COOKIE = '__Host-ptbk_do_owner';
const WINDOW_MS = 10 * 60_000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Loads the commissioning user/team digest for this engine only. @private cloud setup */
export async function cloudOwnerMarker(engineId: string): Promise<string | undefined> {
    if (process.platform !== 'linux' || !isEngineId(engineId)) return undefined;
    try {
        const path = MARKERS + '/' + engineId;
        const file = await lstat(path);
        if (!file.isFile() || file.uid !== 0 || (file.mode & 0o022) !== 0 || file.size > 65) return undefined;
        const value = (await readFile(path, 'utf8')).trim();
        return /^[a-f0-9]{64}$/.test(value) ? value : undefined;
    } catch { return undefined; }
}

/** A provider response is untrusted even after a successful HTTP response. */
function record(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

/** OAuth and private setup redirects must not be cached. */
function redirect(location: string, cookie: string): Response {
    return new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', 'set-cookie': cookie } });
}

/** Re-entering from the installation page starts a fresh attempt. */
function unavailable(status: number): Response {
    return new Response('Return to Promptbook and retry with the DigitalOcean account and team that created this server.', { status, headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' } });
}

/** A browser-bound PKCE transaction on the engine origin. */
interface Attempt { readonly verifier: string; readonly browser: string; readonly clientId: string; readonly origin: string; readonly until: number }

/** Verifies a fresh grant made directly to the engine before it issues the usual first-passkey link. @private DigitalOcean first owner */
export class DigitalOceanOwner {
    private readonly attempts = new Map<string, Attempt>();
    private client?: { origin: string; promise: Promise<string> };
    public constructor(private readonly send: typeof fetch = fetch) {}

    private async request(url: string, init: RequestInit = {}): Promise<Response> {
        return await this.send(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(8_000) });
    }

    private async register(origin: string): Promise<string> {
        const response = await this.request(OAUTH + '/register', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ client_name: 'Promptbook project setup', redirect_uris: [origin + CALLBACK],
                grant_types: ['authorization_code'], token_endpoint_auth_method: 'none', response_types: ['code'] }),
        });
        if (!response.ok) throw new Error('Registration failed');
        const { client_id } = record(await response.json());
        if (typeof client_id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(client_id)) throw new Error('Invalid client');
        return client_id;
    }

    /** The gateway has validated the hostname, initial-owner state and per-client limit. */
    public async handle(request: Request, hostname: string, marker: string, issue: () => Promise<string>): Promise<Response> {
        const url = new URL(request.url);
        const origin = 'https://' + hostname;
        const now = Date.now();
        for (const [id, attempt] of this.attempts) if (attempt.until <= now) this.attempts.delete(id);
        try {
            if (url.pathname === CALLBACK) return await this.finish(request, url, origin, marker, issue);
            if (url.search || this.attempts.size >= 128) return unavailable(429);
            if (this.client?.origin !== origin) this.client = { origin, promise: this.register(origin) };
            let clientId: string;
            try { clientId = await this.client.promise; } catch { this.client = undefined; return unavailable(503); }
            const verifier = randomBytes(32).toString('base64url');
            const state = randomBytes(32).toString('base64url');
            const browser = randomBytes(32).toString('base64url');
            this.attempts.set(state, { verifier, browser, clientId, origin, until: now + WINDOW_MS });
            const authorize = new URL(OAUTH + '/authorize');
            authorize.search = new URLSearchParams({ client_id: clientId, redirect_uri: origin + CALLBACK, response_type: 'code',
                scope: 'droplet:read', prompt: 'select_account', state, code_challenge_method: 'S256',
                code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString();
            return redirect(authorize.href, COOKIE + '=' + browser + '; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600');
        } catch { return unavailable(503); }
    }

    private async finish(request: Request, url: URL, origin: string, marker: string, issue: () => Promise<string>): Promise<Response> {
        const state = url.searchParams.get('state') ?? '';
        const attempt = this.attempts.get(state);
        const cookies = (request.headers.get('cookie') ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE + '='));
        if (!attempt || attempt.origin !== origin || cookies.length !== 1 || cookies[0] !== COOKIE + '=' + attempt.browser) return unavailable(403);
        this.attempts.delete(state);
        const code = url.searchParams.get('code');
        if (!code || code.length > 512 || url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('state').length !== 1 || url.searchParams.has('error')) return unavailable(403);
        const response = await this.request(OAUTH + '/token', { method: 'POST', body: new URLSearchParams({
            grant_type: 'authorization_code', client_id: attempt.clientId, redirect_uri: origin + CALLBACK,
            code, code_verifier: attempt.verifier,
        }) });
        if (!response.ok) return unavailable(403);
        const grant = record(await response.json());
        const token = grant.access_token;
        if (typeof token !== 'string' || !token || token.length > 1024) return unavailable(403);
        const headers = { Authorization: 'Bearer ' + token };
        try {
            const { uuid, team_uuid: team } = record(grant.info);
            if (typeof uuid !== 'string' || typeof team !== 'string' || !UUID.test(uuid) || !UUID.test(team) ||
                createHash('sha256').update(uuid.toLowerCase() + '/' + team.toLowerCase()).digest('hex') !== marker) return unavailable(403);
            const metadata = await this.request('http://169.254.169.254/metadata/v1/id');
            if (!metadata.ok) return unavailable(503);
            const id = (await metadata.text()).trim();
            if (!/^[1-9][0-9]{0,15}$/.test(id)) return unavailable(403);
            const droplet = await this.request('https://api.digitalocean.com/v2/droplets/' + id, { headers });
            if (!droplet.ok || String(record(record(await droplet.json()).droplet).id) !== id) return unavailable(403);
            return redirect('/setup#' + await issue(), COOKIE + '=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
        } finally {
            await this.request(OAUTH + '/revoke', { method: 'POST', headers, body: new URLSearchParams({ token }) }).catch(() => undefined);
        }
    }
}
