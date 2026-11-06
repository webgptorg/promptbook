import { createHash, createPrivateKey, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { PtbkError } from '../../common/errors.js';
import { encodeBase64Url } from '../encoding.js';
import { httpsRequest, type HttpsResponse, type TestTlsOptions } from '../net.js';

/**
 * The ACME directory when `PTBK_ACME_DIRECTORY_URL` is not set (Let's Encrypt production).
 *
 * @private App web origin
 */
export const DEFAULT_ACME_DIRECTORY_URL = 'https://acme-v02.api.letsencrypt.org/directory';

/**
 * Bounds of one ACME request.
 */
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 256 * 1024;

/**
 * How long one issuance may wait for the CA to validate and sign.
 */
const ISSUANCE_DEADLINE_MS = 10 * 60_000;

/**
 * An ACME account key (ECDSA P-256), separate from the engine key.
 *
 * @private App web origin
 */
export type AcmeAccountKey = {
    readonly key: KeyObject;
    /** The public JWK in the member order RFC 7638 thumbprints use. */
    readonly jwk: { readonly crv: string; readonly kty: string; readonly x: string; readonly y: string };
};

/**
 * A new account key and its PKCS#8 PEM for storage.
 *
 * @private App web origin
 */
export function createAcmeAccountKey(): { readonly accountKey: AcmeAccountKey; readonly pem: string } {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    return { accountKey: accountKeyFrom(privateKey), pem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
}

/**
 * Reads a stored account key.
 *
 * @private App web origin
 */
export function loadAcmeAccountKey(pem: string): AcmeAccountKey {
    return accountKeyFrom(createPrivateKey(pem));
}

/**
 * The account key with its public JWK.
 */
function accountKeyFrom(key: KeyObject): AcmeAccountKey {
    const jwk = key.export({ format: 'jwk' });
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.x || !jwk.y) throw new PtbkError('The ACME account key is not an ECDSA P-256 key.', { kind: 'configuration' });
    return { key, jwk: { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y } };
}

/**
 * The RFC 8555 key authorization of a challenge token.
 *
 * @private App web origin
 */
export function keyAuthorization(token: string, accountKey: AcmeAccountKey): string {
    const thumbprint = createHash('sha256').update(JSON.stringify(accountKey.jwk)).digest();
    return `${token}.${encodeBase64Url(thumbprint)}`;
}

/**
 * An ACME problem (`urn:ietf:params:acme:error:*`), with the CA's type and detail but no URLs or tokens.
 *
 * @private App web origin
 */
export class AcmeError extends Error {
    public constructor(
        message: string,
        public readonly type?: string,
        public readonly status?: number,
    ) {
        super(message);
        this.name = 'AcmeError';
    }
}

/**
 * The ACME directory resources the engine uses.
 */
type Directory = { readonly newNonce: string; readonly newAccount: string; readonly newOrder: string };

/**
 * One ACME object as answered (orders, authorizations, challenges).
 */
type AcmeObject = Readonly<Record<string, unknown>>;

/**
 * Callbacks of one issuance: the TLS-ALPN-01 challenge must be answerable through the tunnel while the CA validates.
 *
 * @private App web origin
 */
export type AcmeChallengeHooks = {
    /** Makes the challenge certificate for `hostname` answer `acme-tls/1` hellos (until `withdraw`). */
    readonly present: (hostname: string, keyAuthorization: string) => Promise<void>;
    readonly withdraw: (hostname: string) => void;
};

/**
 * A minimal RFC 8555 client for one engine hostname with TLS-ALPN-01 (RFC 8737): account, order, challenge, finalize
 * and download. Requests honour `HTTPS_PROXY`/`NO_PROXY` and `NODE_EXTRA_CA_CERTS` like every App connection. It never
 * logs URLs, tokens, key authorizations or keys.
 *
 * @private App web origin
 */
export class AcmeClient {
    private directory?: Directory;
    private nonce?: string;
    private accountUrl?: string;

    public constructor(
        private readonly options: {
            readonly directoryUrl: string;
            readonly accountKey: AcmeAccountKey;
            readonly env: NodeJS.ProcessEnv;
            /** A stored account URL (skips `newAccount`). */
            readonly accountUrl?: string;
            readonly tls?: TestTlsOptions;
        },
    ) {
        this.accountUrl = options.accountUrl;
    }

    /** The account URL once known (to store; it identifies the account to the CA). */
    public get account(): string | undefined {
        return this.accountUrl;
    }

    /** One bounded request to the CA. */
    private async request(url: string, method: 'GET' | 'POST', body?: Uint8Array, accept?: string): Promise<HttpsResponse> {
        const response = await httpsRequest({ url, method, headers: { ...(body ? { 'content-type': 'application/jose+json' } : {}), ...(accept ? { accept } : {}), 'user-agent': 'ptbk-engine' }, body, maxResponseBytes: MAX_RESPONSE_BYTES, timeoutMs: REQUEST_TIMEOUT_MS, env: this.options.env, tls: this.options.tls });
        const nonce = response.headers['replay-nonce'];
        if (typeof nonce === 'string' && nonce) this.nonce = nonce;
        return response;
    }

    /** The directory, fetched once. */
    private async resources(): Promise<Directory> {
        if (this.directory) return this.directory;
        const response = await this.request(this.options.directoryUrl, 'GET');
        if (response.status !== 200) throw new AcmeError(`The ACME directory answered HTTP ${String(response.status)}.`, undefined, response.status);
        const directory = parseJson(response.body);
        const newNonce = directory.newNonce;
        const newAccount = directory.newAccount;
        const newOrder = directory.newOrder;
        if (typeof newNonce !== 'string' || typeof newAccount !== 'string' || typeof newOrder !== 'string') throw new AcmeError('The ACME directory is incomplete.');
        this.directory = { newNonce, newAccount, newOrder };
        return this.directory;
    }

    /** A fresh nonce (from the last answer, or `newNonce`). */
    private async takeNonce(): Promise<string> {
        if (!this.nonce) {
            await this.request((await this.resources()).newNonce, 'GET');
            if (!this.nonce) throw new AcmeError('The ACME server gave no nonce.');
        }
        const nonce = this.nonce;
        this.nonce = undefined;
        return nonce;
    }

    /** A signed POST (`payload` undefined: POST-as-GET), retried once on `badNonce`. */
    private async post(url: string, payload: unknown, accept?: string): Promise<HttpsResponse> {
        for (let attempt = 0; ; attempt++) {
            const nonce = await this.takeNonce();
            const header = { alg: 'ES256', nonce, url, ...(this.accountUrl && url !== this.directory?.newAccount ? { kid: this.accountUrl } : { jwk: this.options.accountKey.jwk }) };
            const protectedPart = encodeBase64Url(Buffer.from(JSON.stringify(header)));
            const payloadPart = payload === undefined ? '' : encodeBase64Url(Buffer.from(JSON.stringify(payload)));
            const signature = sign('sha256', Buffer.from(`${protectedPart}.${payloadPart}`), { key: this.options.accountKey.key, dsaEncoding: 'ieee-p1363' });
            const body = Buffer.from(JSON.stringify({ protected: protectedPart, payload: payloadPart, signature: encodeBase64Url(signature) }));
            const response = await this.request(url, 'POST', body, accept);
            if (response.status < 400) return response;
            const problem = parseProblem(response);
            if (problem.type === 'urn:ietf:params:acme:error:badNonce' && attempt < 2) continue;
            throw problem;
        }
    }

    /** Creates or finds the account (terms of service agreed). */
    private async ensureAccount(): Promise<void> {
        if (this.accountUrl) return;
        const directory = await this.resources();
        const response = await this.post(directory.newAccount, { termsOfServiceAgreed: true });
        const location = response.headers.location;
        if (typeof location !== 'string') throw new AcmeError('The ACME server gave no account URL.');
        this.accountUrl = location;
    }

    /** Polls an order or authorization until it leaves `pending`/`processing`. */
    private async poll(url: string, deadline: number, done: (object: AcmeObject) => boolean): Promise<AcmeObject> {
        for (;;) {
            const response = await this.post(url, undefined);
            const object = parseJson(response.body);
            if (done(object)) return object;
            if (Date.now() > deadline) throw new AcmeError('The ACME server did not finish in time.');
            const retryAfter = Number(response.headers['retry-after']);
            await new Promise((resolve) => setTimeout(resolve, Math.min(10_000, Math.max(1_000, Number.isFinite(retryAfter) ? retryAfter * 1000 : 2_000))));
        }
    }

    /**
     * Orders a certificate for `hostname` and returns its PEM chain. `csr` is the DER request for the TLS key; the
     * challenge is presented through `hooks` only while the CA validates.
     */
    public async issue(hostname: string, csr: Uint8Array, hooks: AcmeChallengeHooks): Promise<string> {
        const deadline = Date.now() + ISSUANCE_DEADLINE_MS;
        await this.ensureAccount();
        const directory = await this.resources();
        const created = await this.post(directory.newOrder, { identifiers: [{ type: 'dns', value: hostname }] });
        const orderUrl = created.headers.location;
        if (typeof orderUrl !== 'string') throw new AcmeError('The ACME server gave no order URL.');
        let order = parseJson(created.body);
        const authorizations = Array.isArray(order.authorizations) ? order.authorizations.filter((url): url is string => typeof url === 'string') : [];
        for (const authorizationUrl of authorizations) {
            const authorization = parseJson((await this.post(authorizationUrl, undefined)).body);
            if (authorization.status === 'valid') continue;
            const challenge = (Array.isArray(authorization.challenges) ? (authorization.challenges as AcmeObject[]) : []).find((item) => item.type === 'tls-alpn-01');
            if (!challenge || typeof challenge.url !== 'string' || typeof challenge.token !== 'string') throw new AcmeError('The ACME server offered no tls-alpn-01 challenge.');
            await hooks.present(hostname, keyAuthorization(challenge.token, this.options.accountKey));
            try {
                await this.post(challenge.url, {});
                const settled = await this.poll(authorizationUrl, deadline, (object) => object.status !== 'pending' && object.status !== 'processing');
                if (settled.status !== 'valid') throw new AcmeError(`The CA could not validate ${hostname} through the relay (${challengeError(settled)}).`, 'validation');
            } finally {
                hooks.withdraw(hostname);
            }
        }
        if (typeof order.finalize !== 'string') throw new AcmeError('The ACME order has no finalize URL.');
        const finalized = await this.post(order.finalize, { csr: encodeBase64Url(csr) });
        order = parseJson(finalized.body);
        if (order.status !== 'valid') order = await this.poll(orderUrl, deadline, (object) => object.status === 'valid' || object.status === 'invalid');
        if (order.status !== 'valid' || typeof order.certificate !== 'string') throw new AcmeError('The ACME order did not complete.');
        const certificate = await this.post(order.certificate, undefined, 'application/pem-certificate-chain');
        const pem = certificate.body.toString('utf8');
        if (!pem.includes('-----BEGIN CERTIFICATE-----')) throw new AcmeError('The ACME server did not return a certificate chain.');
        return pem;
    }
}

/**
 * Parses an ACME JSON answer.
 */
function parseJson(body: Buffer): AcmeObject {
    try {
        const value: unknown = JSON.parse(body.toString('utf8'));
        if (value && typeof value === 'object' && !Array.isArray(value)) return value as AcmeObject;
    } catch {
        // Below.
    }
    throw new AcmeError('The ACME server answered with something other than a JSON object.');
}

/**
 * An ACME error answer as an `AcmeError` (type and detail only).
 */
function parseProblem(response: HttpsResponse): AcmeError {
    try {
        const problem = parseJson(response.body);
        const type = typeof problem.type === 'string' ? problem.type : undefined;
        const detail = typeof problem.detail === 'string' ? problem.detail.slice(0, 300) : `HTTP ${String(response.status)}`;
        return new AcmeError(`The ACME server refused the request: ${detail}`, type, response.status);
    } catch {
        return new AcmeError(`The ACME server answered HTTP ${String(response.status)}.`, undefined, response.status);
    }
}

/**
 * The CA's reason for an invalid authorization, without URLs.
 */
function challengeError(authorization: AcmeObject): string {
    const challenges = Array.isArray(authorization.challenges) ? (authorization.challenges as AcmeObject[]) : [];
    for (const challenge of challenges) {
        const error = challenge.error as AcmeObject | undefined;
        if (error && typeof error.detail === 'string') return error.detail.slice(0, 300);
    }
    return String(authorization.status ?? 'invalid');
}
