import { createHash, X509Certificate } from 'node:crypto';
import { httpsRequest } from '../net.js';

/** An exact engine hostname should have very few unexpired issuances; overflow remains a failed scan. */
const MAX_CT_CERTIFICATES = 64;
/** Bounded size of one DER or PEM certificate response. */
const MAX_CT_CERTIFICATE_BYTES = 131_072;
/** The contract's hourly certificate-transparency cadence. */
const CT_CHECK_INTERVAL_MS = 3_600_000;
/** A stalled log lookup cannot hold the watcher indefinitely. */
const CT_SCAN_TIMEOUT_MS = 30_000;
/** Largest issuer label accepted by the security contract. */
const CT_ISSUER_LENGTH = 512;

/** The existing security-panel contract; certificates and issuer names are public metadata. @private App TLS */
export type CtCheck = { readonly at: string; readonly result: 'ok' | 'unexpected-certificate' | 'failed'; readonly unexpectedCertificates: readonly { readonly sha256: string; readonly issuer: string; readonly notBefore: string; readonly notAfter: string }[] };

/** Bounded retrieval of the actual certificate bytes, not an issuer or serial-number trust heuristic. @private App TLS */
export type CtSource = (hostname: string, signal: AbortSignal) => Promise<readonly Uint8Array[]>;

/** SPKI hashes survive a CA's precertificate/final-certificate differences. @private App TLS */
export function certificatePublicKeyHash(certificate: X509Certificate): string {
    return createHash('sha256').update(certificate.publicKey.export({ format: 'der', type: 'spki' })).digest('hex');
}

/** Queries crt.sh over verified HTTPS; unbounded, malformed or partial answers are failures, never a clean result. @private App TLS */
export function publicCtSource(env: NodeJS.ProcessEnv): CtSource {
    return async (hostname, signal) => {
        const get = async (url: string, maxResponseBytes: number): Promise<Buffer> => {
            signal.throwIfAborted();
            const response = await httpsRequest({ url, method: 'GET', headers: { accept: 'application/json, application/pkix-cert' }, maxResponseBytes, timeoutMs: 10_000, env });
            signal.throwIfAborted();
            if (response.status !== 200) throw new Error('Certificate log unavailable.');
            return response.body;
        };
        const rows: unknown = JSON.parse((await get(`https://crt.sh/?q=${encodeURIComponent(hostname)}&output=json`, 1024 * 1024)).toString('utf8'));
        if (!Array.isArray(rows) || rows.length > 2000) throw new Error('Invalid certificate log answer.');
        const ids = new Set<string>();
        for (const row of rows) {
            if (!row || typeof row !== 'object' || !/^[0-9]{1,20}$/.test(String(row.id)) || typeof row.not_after !== 'string') throw new Error('Invalid certificate log entry.');
            const expiry = Date.parse(row.not_after.endsWith('Z') ? row.not_after : row.not_after + 'Z');
            if (!Number.isFinite(expiry)) throw new Error('Invalid certificate expiry.');
            if (expiry > Date.now()) ids.add(String(row.id));
        }
        if (ids.size > MAX_CT_CERTIFICATES) throw new Error('Certificate log result exceeds the scan bound.');
        const certificates: Uint8Array[] = [];
        const pending = [...ids];
        await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
            while (pending.length) {
                const id = pending.shift()!;
                certificates.push(await get(`https://crt.sh/?d=${id}`, MAX_CT_CERTIFICATE_BYTES));
            }
        }));
        return certificates;
    };
}

/** Hourly certificate-transparency checks, coalesced and isolated from certificate issuance and engine startup. @private App TLS */
export class CertificateTransparencyWatch {
    private last?: CtCheck;
    private timer?: NodeJS.Timeout;
    private running?: Promise<void>;
    private readonly abort = new AbortController();

    public constructor(private readonly options: {
        readonly hostname: string; readonly knownKeys: () => readonly string[]; readonly source: CtSource;
        readonly changed: () => void; readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
    }) {}

    /** Arms the actual hourly timer; the first scan waits until the engine has its own key. */
    public start(): void { this.timer = setInterval(() => void this.check(), CT_CHECK_INTERVAL_MS).unref(); this.observe(); }

    /** Certificate issuance may finish after the origin has started. */
    public observe(): void { if (!this.last && this.options.knownKeys().length) void this.check(); }

    /** The latest completed scan, exposed only through security.read. */
    public view(): CtCheck | null { return this.last ?? null; }

    /** One bounded scan; compare actual SPKIs and DNS names, never trust a certificate's claimed issuer. */
    public async check(): Promise<void> {
        if (this.abort.signal.aborted || !this.options.knownKeys().length) return;
        if (this.running) return await this.running;
        this.running = (async () => {
            try {
                const certificates = await this.options.source(this.options.hostname, AbortSignal.any([this.abort.signal, AbortSignal.timeout(CT_SCAN_TIMEOUT_MS)]));
                const known = new Set(this.options.knownKeys());
                const unexpected = new Map<string, CtCheck['unexpectedCertificates'][number]>();
                for (const bytes of certificates) {
                    const certificate = new X509Certificate(bytes);
                    if (!certificate.checkHost(this.options.hostname, { subject: 'never' })) throw new Error('Certificate log returned another hostname.');
                    if (Date.parse(certificate.validTo) <= Date.now() || known.has(certificatePublicKeyHash(certificate))) continue;
                    const sha256 = certificate.fingerprint256.replaceAll(':', '').toLowerCase();
                    unexpected.set(sha256, { sha256, issuer: certificate.issuer.slice(0, CT_ISSUER_LENGTH) || 'Unknown issuer', notBefore: new Date(certificate.validFrom).toISOString(), notAfter: new Date(certificate.validTo).toISOString() });
                }
                if (this.abort.signal.aborted) return;
                this.last = { at: new Date().toISOString(), result: unexpected.size ? 'unexpected-certificate' : 'ok', unexpectedCertificates: [...unexpected.values()].slice(0, 16) };
                if (unexpected.size) this.options.log?.(`Certificate warning: a certificate with another public key exists for ${this.options.hostname}. Review Security in the app.`, 'error');
            } catch {
                if (this.abort.signal.aborted) return;
                this.last = { at: new Date().toISOString(), result: 'failed', unexpectedCertificates: [] };
                this.options.log?.('The certificate transparency log could not be checked. Review Security in the app; the engine is not reporting this check as safe.', 'warning');
            }
            this.options.changed();
        })().finally(() => { this.running = undefined; });
        await this.running;
    }

    /** No late network response may change security state after the origin stops. */
    public stop(): void { clearInterval(this.timer); this.abort.abort(); }
}
