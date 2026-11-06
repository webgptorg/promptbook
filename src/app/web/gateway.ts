import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { errorMessage } from '../../common/errors.js';
import { GATEWAY_ASSETS, GATEWAY_ASSET_PATH, api, isSafeNextPath, pickGatewayLanguage, renderGatewayPage, webauthn } from '../../vendor/app-platform.js';
import { decodeBase64Url, encodeBase64Url } from '../encoding.js';
import type { EngineFingerprint } from '../identity.js';
import type { AccessStore, Actor, StoredPasskey } from './access.js';
import { SESSION_ABSOLUTE_TIMEOUT_MS } from './access.js';
import type { SecureConnectionInfo } from './tls.js';

/**
 * The session cookie: `__Host-` (Secure, Path=/, no Domain), HttpOnly and SameSite=Strict.
 *
 * @private App gateway
 */
export const SESSION_COOKIE_NAME = '__Host-ptbk_session';

/**
 * Gateway paths the pages and the UI use.
 */
const SETUP_PATH = '/setup';
const SIGN_IN_PATH = api.SIGN_IN_PATH;
const SIGN_OUT_PATH = api.SIGN_OUT_PATH;
const STEP_UP_PATH = api.STEP_UP_PATH;

/**
 * Methods that change nothing (no Fetch Metadata check).
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * How long a WebAuthn challenge is valid (single use, bound to its purpose).
 */
const CHALLENGE_LIFETIME_MS = 5 * 60_000;

/**
 * Body caps of the gateway endpoints.
 */
const CEREMONY_BODY_MAX_BYTES = 32 * 1024;

/**
 * Anonymous requests one client address may make per minute to the gateway's ceremony endpoints.
 */
const ANONYMOUS_REQUESTS_PER_MINUTE = 60;

/**
 * The security headers on every response inside the tunnel: UI files, API, gateway pages and errors alike.
 *
 * @private App gateway
 */
export const ENGINE_SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
    'content-security-policy': api.ENGINE_UI_CSP,
    'strict-transport-security': 'max-age=31536000',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
});

/**
 * The gateway pages and assets, read once from the vendored `@ptbk/gateway-pages`.
 */
type GatewayFiles = { readonly pages: Readonly<Record<string, string>>; readonly assets: ReadonlyMap<string, { readonly bytes: Buffer; readonly type: string }> };

/**
 * Reads the vendored gateway pages.
 */
async function loadGatewayFiles(): Promise<GatewayFiles> {
    const directory = new URL('../../vendor/gateway-pages/', import.meta.url);
    const pages: Record<string, string> = {};
    for (const name of ['setup.html', 'sign-in.html', 'step-up.html']) pages[name] = await readFile(fileURLToPath(new URL(name, directory)), 'utf8');
    const assets = new Map<string, { bytes: Buffer; type: string }>();
    for (const [name, type] of Object.entries(GATEWAY_ASSETS)) assets.set(name, { bytes: await readFile(fileURLToPath(new URL(name, directory))), type });
    return { pages, assets };
}

/**
 * A gateway problem answer (`application/problem+json`).
 */
function problem(status: number, code: string, extra: Readonly<Record<string, unknown>> = {}): Response {
    return new Response(JSON.stringify({ type: 'about:blank', title: code, status, code, ...extra }), { status, headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' } });
}

/**
 * A contract problem (engine API codes) as a response.
 *
 * @private App gateway
 */
export function contractProblem(code: string, extensions: Readonly<Record<string, unknown>> = {}): Response {
    const body = api.createProblem(code, extensions);
    return new Response(JSON.stringify(body), { status: body.status, headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' } });
}

/**
 * The session token from `Cookie`; a malformed or repeated cookie is no session.
 *
 * @private App gateway
 */
export function sessionToken(cookieHeader: string | null): string | undefined {
    if (!cookieHeader) return undefined;
    const values = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
        .map((part) => part.slice(SESSION_COOKIE_NAME.length + 1));
    return values.length === 1 && /^[A-Za-z0-9_-]{22}$/.test(values[0] ?? '') ? values[0] : undefined;
}

/**
 * The `Set-Cookie` value of a new session.
 */
function sessionCookie(token: string): string {
    return `${SESSION_COOKIE_NAME}=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${String(SESSION_ABSOLUTE_TIMEOUT_MS / 1000)}`;
}

/**
 * The `Set-Cookie` value that clears the session cookie.
 */
const CLEARED_COOKIE = `${SESSION_COOKIE_NAME}=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

/**
 * Where an anonymous document goes: sign-in with the requested path and query as `next` (only when it is safe).
 *
 * @private App gateway
 */
export function signInLocation(target: string): string {
    if (target === '/' || !isSafeNextPath(target)) return SIGN_IN_PATH;
    return `${SIGN_IN_PATH}?${new URLSearchParams({ next: target }).toString()}`;
}

/**
 * One audit-relevant gateway event (`auth.*`, `passkey.*`, `session.*`).
 *
 * @private App gateway
 */
export type GatewayAuditEvent = {
    readonly action: string;
    readonly memberId: string | null;
    readonly outcome: 'success' | 'failure' | 'denied';
    readonly client: { readonly ip: string; readonly userAgent: string };
    readonly target?: { readonly kind: string; readonly id: string; readonly name?: string };
};

/**
 * What the gateway needs from the engine.
 *
 * @private App gateway
 */
export type GatewayOptions = {
    readonly access: AccessStore;
    readonly engineId: string;
    readonly fingerprint: EngineFingerprint;
    /** The engine API behind the gateway (only signed-in requests reach it). */
    readonly api: (request: Request, actor: Actor) => Promise<Response>;
    /** Documents and UI files for a signed-in member (the UI bundle or the plain engine page). */
    readonly documents: (request: Request, actor: Actor) => Promise<Response>;
    readonly audit?: (event: GatewayAuditEvent) => void;
    readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
};

/**
 * One pending WebAuthn challenge.
 */
type Challenge = { readonly purpose: 'setup' | 'sign-in' | 'step-up'; readonly expiresAt: number; readonly rpId: string; readonly sessionId?: string; readonly userId?: string };

/**
 * The engine's gateway, the only listener behind its TLS server: it rejects cross-site requests with Fetch Metadata
 * before anything else runs, resolves the `__Host-` session cookie on every request, keeps anonymous visitors to the
 * sign-in, setup and WebAuthn endpoints (401 problem+json for anonymous API calls, a redirect to sign-in with `next`
 * for documents), signs in with passkeys only (WebAuthn on the engine's own hostname), asks for a fresh assertion on
 * step-up routes, and sends the security headers on every response.
 *
 * @private App gateway
 */
export class Gateway {
    private files?: GatewayFiles;
    private readonly challenges = new Map<string, Challenge>();
    private readonly rates = new Map<string, { windowStart: number; count: number }>();

    public constructor(private readonly options: GatewayOptions) {}

    /** Answers one request of a secure connection; never throws. */
    public async handle(request: Request, connection: SecureConnectionInfo): Promise<Response> {
        let response: Response;
        try {
            response = await this.route(request, connection);
        } catch (error) {
            this.options.log?.(`The engine gateway failed a request: ${errorMessage(error)}`, 'error');
            response = contractProblem('internal-error');
        }
        return withSecurityHeaders(response);
    }

    /** The request's client for audit and sessions. */
    private client(request: Request, connection: SecureConnectionInfo): { ip: string; userAgent: string } {
        return { ip: connection.clientIp, userAgent: (request.headers.get('user-agent') ?? '').slice(0, 512) };
    }

    /** Routes one request. */
    private async route(request: Request, connection: SecureConnectionInfo): Promise<Response> {
        const url = new URL(request.url);
        const host = request.headers.get('host')?.toLowerCase() ?? '';
        if (host.replace(/:\d{1,5}$/, '') !== connection.hostname) return problem(421, 'misdirected-request');
        // Cross-site protection first: no handler runs for a state-changing request from another origin.
        if (!SAFE_METHODS.has(request.method)) {
            const origin = request.headers.get('origin')?.toLowerCase();
            const site = request.headers.get('sec-fetch-site')?.toLowerCase();
            if (origin !== `https://${host}` || (site !== 'same-origin' && site !== 'none')) return contractProblem('forbidden');
        }
        const path = url.pathname;
        const client = this.client(request, connection);
        const token = sessionToken(request.headers.get('cookie'));
        const actor = token ? this.options.access.authenticate(token, client) : undefined;

        if (path.startsWith(GATEWAY_ASSET_PATH) && request.method === 'GET') return await this.asset(path.slice(GATEWAY_ASSET_PATH.length));
        if (path === SETUP_PATH && request.method === 'GET') return await this.page('setup.html', request, connection);
        if (path === SIGN_IN_PATH && request.method === 'GET') return await this.page('sign-in.html', request, connection);
        if (path === `${SETUP_PATH}/options` && request.method === 'POST') return this.limited(client) ?? (await this.setupOptions(request, connection));
        if (path === `${SETUP_PATH}/verify` && request.method === 'POST') return this.limited(client) ?? (await this.setupVerify(request, connection, client));
        if (path === `${SIGN_IN_PATH}/options` && request.method === 'POST') return this.limited(client) ?? (await this.signInOptions(connection));
        if (path === `${SIGN_IN_PATH}/verify` && request.method === 'POST') return this.limited(client) ?? (await this.signInVerify(request, connection, client));
        if (path === SIGN_OUT_PATH && request.method === 'POST') {
            if (!actor) return contractProblem('unauthenticated', {});
            await this.options.access.revokeSessions((session) => session.id === actor.sessionId);
            this.options.audit?.({ action: 'auth.sign-out', memberId: actor.memberId, outcome: 'success', client });
            return new Response(null, { status: 204, headers: { 'set-cookie': CLEARED_COOKIE, 'cache-control': 'no-store' } });
        }

        if (!actor) {
            const headers = new Headers({ 'cache-control': 'no-store' });
            if (request.headers.get('cookie')?.includes(`${SESSION_COOKIE_NAME}=`)) headers.set('set-cookie', CLEARED_COOKIE);
            const isApi = path === api.ENGINE_API_PREFIX || path.startsWith(`${api.ENGINE_API_PREFIX}/`);
            if (isApi || !SAFE_METHODS.has(request.method)) {
                headers.set('content-type', 'application/problem+json');
                return new Response(JSON.stringify(api.createProblem('unauthenticated')), { status: 401, headers });
            }
            headers.set('location', signInLocation(`${url.pathname}${url.search}`));
            return new Response(null, { status: 303, headers });
        }

        if (path === STEP_UP_PATH && request.method === 'GET') return await this.page('step-up.html', request, connection);
        if (path === `${STEP_UP_PATH}/options` && request.method === 'POST') return await this.stepUpOptions(connection, actor);
        if (path === `${STEP_UP_PATH}/verify` && request.method === 'POST') return await this.stepUpVerify(request, connection, actor, client);
        if (path === api.ENGINE_API_PREFIX || path.startsWith(`${api.ENGINE_API_PREFIX}/`)) return await this.options.api(request, actor);
        if (path.startsWith('/auth/') || path === '/auth' || path.startsWith('/.well-known/')) return contractProblem('not-found');
        return await this.options.documents(request, actor);
    }

    /** A per-client-address limit on anonymous ceremony endpoints. */
    private limited(client: { readonly ip: string }): Response | undefined {
        const now = Date.now();
        const entry = this.rates.get(client.ip);
        if (!entry || now - entry.windowStart > 60_000) {
            this.rates.set(client.ip, { windowStart: now, count: 1 });
            if (this.rates.size > 10_000) this.rates.clear();
            return undefined;
        }
        entry.count += 1;
        return entry.count > ANONYMOUS_REQUESTS_PER_MINUTE ? problem(429, 'rate-limited') : undefined;
    }

    /** The vendored pages and assets. */
    private async gatewayFiles(): Promise<GatewayFiles> {
        this.files ??= await loadGatewayFiles();
        return this.files;
    }

    /** One gateway asset. */
    private async asset(name: string): Promise<Response> {
        const asset = (await this.gatewayFiles()).assets.get(name);
        if (!asset) return contractProblem('not-found');
        return new Response(new Uint8Array(asset.bytes), { headers: { 'content-type': asset.type, 'cache-control': 'no-store' } });
    }

    /** One gateway page filled with public values. */
    private async page(name: string, request: Request, connection: SecureConnectionInfo): Promise<Response> {
        const template = (await this.gatewayFiles()).pages[name] ?? '';
        const html = renderGatewayPage(template, {
            lang: pickGatewayLanguage(request.headers.get('accept-language')),
            engineId: this.options.engineId,
            hostname: connection.hostname,
            fingerprint: this.options.fingerprint.formatted,
            fingerprintCells: this.options.fingerprint.cells.flat().map((filled) => (filled ? '1' : '0')).join(''),
            command: 'ptbk',
            owner: this.options.access.hasOwner ? 'set' : 'none',
        });
        return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    /** Reads a bounded JSON object body. */
    private async jsonBody(request: Request): Promise<Readonly<Record<string, unknown>> | undefined> {
        if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') return undefined;
        const text = await request.text();
        if (text.length > CEREMONY_BODY_MAX_BYTES) return undefined;
        try {
            const value: unknown = JSON.parse(text);
            return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
        } catch {
            return undefined;
        }
    }

    /** Remembers a challenge, dropping expired ones. */
    private remember(challenge: string, entry: Challenge): void {
        const now = Date.now();
        for (const [key, value] of this.challenges) if (value.expiresAt <= now) this.challenges.delete(key);
        if (this.challenges.size > 1000) this.challenges.clear();
        this.challenges.set(challenge, entry);
    }

    /** Takes (consumes) a challenge of a purpose, from the response's client data. */
    private take(response: unknown, purpose: Challenge['purpose'], rpId: string, sessionId?: string): string | undefined {
        const clientData = (response as { response?: { clientDataJSON?: unknown } } | undefined)?.response?.clientDataJSON;
        if (typeof clientData !== 'string') return undefined;
        let challenge: unknown;
        try {
            challenge = (JSON.parse(Buffer.from(decodeBase64Url(clientData) ?? new Uint8Array()).toString('utf8')) as { challenge?: unknown }).challenge;
        } catch {
            return undefined;
        }
        if (typeof challenge !== 'string') return undefined;
        const entry = this.challenges.get(challenge);
        this.challenges.delete(challenge);
        if (!entry || entry.purpose !== purpose || entry.rpId !== rpId || entry.expiresAt <= Date.now() || (sessionId !== undefined && entry.sessionId !== sessionId)) return undefined;
        return challenge;
    }

    /** `POST /setup/options {secret}`: registration options for the owner's first passkey (secret not consumed). */
    private async setupOptions(request: Request, connection: SecureConnectionInfo): Promise<Response> {
        const body = await this.jsonBody(request);
        const secret = typeof body?.secret === 'string' ? body.secret : '';
        if (this.options.access.hasOwner) return problem(409, 'owner-exists');
        if (!this.options.access.setupSecretValid(secret)) return problem(403, 'setup-link-invalid');
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);
        const options = await webauthn.generateRegistrationOptions({
            rpName: 'Promptbook engine',
            rpID: connection.hostname,
            userName: `owner@${connection.hostname}`,
            userDisplayName: 'Owner',
            userID: userId,
            attestationType: 'none',
            authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
            supportedAlgorithmIDs: [-8, -7, -257],
            timeout: CHALLENGE_LIFETIME_MS,
        });
        this.remember(options.challenge, { purpose: 'setup', expiresAt: Date.now() + CHALLENGE_LIFETIME_MS, rpId: connection.hostname, userId: encodeBase64Url(userId) });
        return Response.json({ options }, { headers: { 'cache-control': 'no-store' } });
    }

    /** `POST /setup/verify {secret, response}`: verifies the passkey, consumes the secret, signs the owner in. */
    private async setupVerify(request: Request, connection: SecureConnectionInfo, client: { ip: string; userAgent: string }): Promise<Response> {
        const body = await this.jsonBody(request);
        const secret = typeof body?.secret === 'string' ? body.secret : '';
        if (this.options.access.hasOwner) return problem(409, 'owner-exists');
        if (!this.options.access.setupSecretValid(secret)) return problem(403, 'setup-link-invalid');
        const challenge = this.take(body?.response, 'setup', connection.hostname);
        if (!challenge) return problem(400, 'passkey-not-verified');
        let verification: Awaited<ReturnType<typeof webauthn.verifyRegistrationResponse>>;
        try {
            verification = await webauthn.verifyRegistrationResponse({ response: body?.response, expectedChallenge: challenge, expectedOrigin: `https://${request.headers.get('host') ?? connection.hostname}`, expectedRPID: connection.hostname, requireUserVerification: true });
        } catch {
            return problem(400, 'passkey-not-verified');
        }
        const info = verification.registrationInfo;
        if (!verification.verified || !info) return problem(400, 'passkey-not-verified');
        const attachment = (body?.response as { authenticatorAttachment?: unknown } | undefined)?.authenticatorAttachment;
        const { member, passkey } = await this.options.access.completeSetup(secret, {
            credentialId: info.credential.id,
            name: 'Passkey',
            publicKey: encodeBase64Url(info.credential.publicKey),
            counter: info.credential.counter,
            transports: [...(info.credential.transports ?? [])],
            attachment: attachment === 'platform' || attachment === 'cross-platform' ? attachment : null,
            backedUp: info.credentialBackedUp,
            rpId: connection.hostname,
        });
        const { token } = await this.options.access.signIn(member.id, passkey.id, client);
        this.options.audit?.({ action: 'passkey.registered', memberId: member.id, outcome: 'success', client, target: { kind: 'passkey', id: passkey.id } });
        this.options.audit?.({ action: 'auth.sign-in', memberId: member.id, outcome: 'success', client });
        this.options.log?.('The engine owner set up App access with a passkey.', 'info');
        return Response.json({ next: '/' }, { headers: { 'set-cookie': sessionCookie(token), 'cache-control': 'no-store' } });
    }

    /** `POST /auth/sign-in/options {}`: usernameless assertion options. */
    private async signInOptions(connection: SecureConnectionInfo): Promise<Response> {
        const options = await webauthn.generateAuthenticationOptions({ rpID: connection.hostname, userVerification: 'required', timeout: CHALLENGE_LIFETIME_MS });
        this.remember(options.challenge, { purpose: 'sign-in', expiresAt: Date.now() + CHALLENGE_LIFETIME_MS, rpId: connection.hostname });
        return Response.json({ options }, { headers: { 'cache-control': 'no-store' } });
    }

    /** Verifies one assertion against a stored passkey of this hostname. */
    private async verifyAssertion(response: unknown, challenge: string, request: Request, connection: SecureConnectionInfo): Promise<StoredPasskey | undefined> {
        const credentialId = (response as { id?: unknown } | undefined)?.id;
        const passkey = typeof credentialId === 'string' ? this.options.access.passkeyByCredential(credentialId) : undefined;
        if (!passkey || passkey.rpId !== connection.hostname) return undefined;
        try {
            const verification = await webauthn.verifyAuthenticationResponse({
                response,
                expectedChallenge: challenge,
                expectedOrigin: `https://${request.headers.get('host') ?? connection.hostname}`,
                expectedRPID: connection.hostname,
                credential: { id: passkey.credentialId, publicKey: decodeBase64Url(passkey.publicKey), counter: passkey.counter, transports: passkey.transports },
                requireUserVerification: true,
            });
            if (!verification.verified) return undefined;
            const flags = (response as { response?: { authenticatorData?: string } }).response?.authenticatorData;
            const data = typeof flags === 'string' ? decodeBase64Url(flags) : undefined;
            const backedUp = data && data.length > 32 ? ((data[32] ?? 0) & 0x10) !== 0 : null;
            await this.options.access.passkeyUsed(passkey.id, verification.authenticationInfo.newCounter, backedUp);
            return passkey;
        } catch {
            return undefined;
        }
    }

    /** `POST /auth/sign-in/verify {response, next?}`: a new session for the passkey's member. */
    private async signInVerify(request: Request, connection: SecureConnectionInfo, client: { ip: string; userAgent: string }): Promise<Response> {
        const body = await this.jsonBody(request);
        const challenge = this.take(body?.response, 'sign-in', connection.hostname);
        const passkey = challenge ? await this.verifyAssertion(body?.response, challenge, request, connection) : undefined;
        const member = passkey ? this.options.access.member(passkey.memberId) : undefined;
        if (!passkey || !member || member.status !== 'active') {
            this.options.audit?.({ action: 'auth.sign-in', memberId: null, outcome: 'failure', client });
            return problem(401, 'passkey-not-recognised');
        }
        const { token } = await this.options.access.signIn(member.id, passkey.id, client);
        this.options.audit?.({ action: 'auth.sign-in', memberId: member.id, outcome: 'success', client });
        const next = typeof body?.next === 'string' && isSafeNextPath(body.next) ? body.next : '/';
        return Response.json({ next }, { headers: { 'set-cookie': sessionCookie(token), 'cache-control': 'no-store' } });
    }

    /** `POST /auth/step-up/options {}`: assertion options limited to the member's own passkeys. */
    private async stepUpOptions(connection: SecureConnectionInfo, actor: Actor): Promise<Response> {
        const allowCredentials = this.options.access
            .passkeys(actor.memberId)
            .filter((passkey) => passkey.rpId === connection.hostname)
            .map((passkey) => ({ id: passkey.credentialId, transports: passkey.transports }));
        const options = await webauthn.generateAuthenticationOptions({ rpID: connection.hostname, userVerification: 'required', allowCredentials, timeout: CHALLENGE_LIFETIME_MS });
        this.remember(options.challenge, { purpose: 'step-up', expiresAt: Date.now() + CHALLENGE_LIFETIME_MS, rpId: connection.hostname, sessionId: actor.sessionId });
        return Response.json({ options }, { headers: { 'cache-control': 'no-store' } });
    }

    /** `POST /auth/step-up/verify {response, next?}`: a fresh assertion by one of the session member's passkeys. */
    private async stepUpVerify(request: Request, connection: SecureConnectionInfo, actor: Actor, client: { ip: string; userAgent: string }): Promise<Response> {
        const body = await this.jsonBody(request);
        const challenge = this.take(body?.response, 'step-up', connection.hostname, actor.sessionId);
        const passkey = challenge ? await this.verifyAssertion(body?.response, challenge, request, connection) : undefined;
        if (!passkey || passkey.memberId !== actor.memberId) {
            this.options.audit?.({ action: 'auth.step-up', memberId: actor.memberId, outcome: 'failure', client });
            return problem(401, 'passkey-not-recognised');
        }
        await this.options.access.confirmStepUp(actor.sessionId);
        this.options.audit?.({ action: 'auth.step-up', memberId: actor.memberId, outcome: 'success', client });
        const next = typeof body?.next === 'string' && isSafeNextPath(body.next) ? body.next : '/';
        return Response.json({ next }, { headers: { 'cache-control': 'no-store' } });
    }
}

/**
 * A copy of a response with the engine's security headers (and `Cache-Control: no-store` unless it chose caching).
 *
 * @private App gateway
 */
export function withSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(ENGINE_SECURITY_HEADERS)) headers.set(name, value);
    if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
