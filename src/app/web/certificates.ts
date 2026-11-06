import { X509Certificate } from 'node:crypto';
import { join } from 'node:path';
import { errorMessage } from '../../common/errors.js';
import { CONFORMANCE_BUILD } from '../build.js';
import { ensurePrivateDirectory, readPrivateFile, writePrivateFile } from '../files.js';
import type { TestTlsOptions } from '../net.js';
import { AcmeClient, DEFAULT_ACME_DIRECTORY_URL, createAcmeAccountKey, loadAcmeAccountKey } from './acme.js';
import { certificateValidity, createAcmeChallengeCertificate, createCertificateRequest, createLocalCa, generateTlsKeyPair, importTlsKeyPair, issueLocalLeaf, privateKeyPem, type LocalCa, type TlsCredentials } from './x509.js';

/**
 * Subdirectory of the App data directory holding the served certificates and their keys.
 */
const TLS_DIRECTORY = 'tls';

/**
 * The ACME account key (mode 0600) and the account record.
 */
const ACME_ACCOUNT_KEY_FILE = 'acme-account-key.pem';
const ACME_ACCOUNT_FILE = 'acme-account.json';

/**
 * The conformance build's development CA, at `<PTBK_DATA_DIR>/dev-ca/ca-cert.pem` (the path `--engine-ca-file` takes).
 *
 * @private App web origin
 */
export const DEV_CA_DIRECTORY = 'dev-ca';

/**
 * File of the development CA certificate inside `DEV_CA_DIRECTORY`.
 *
 * @private App web origin
 */
export const DEV_CA_CERT_FILE = 'ca-cert.pem';

/**
 * File of the development CA key inside `DEV_CA_DIRECTORY`.
 */
const DEV_CA_KEY_FILE = 'ca-key.pem';

/**
 * Renewal and retry cadence.
 */
const CHECK_INTERVAL_MS = 60 * 60_000;
const RETRY_DELAYS_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000, 4 * 60 * 60_000];

/**
 * Where the engine's own certificate comes from: ACME (production) or the conformance build's development CA.
 *
 * @private App web origin
 */
export type CertificateSourceKind = 'acme' | 'dev-ca';

/**
 * The certificate state of one hostname, for the App page and `GET /security`.
 *
 * @private App web origin
 */
export type CertificateView = {
    readonly hostname: string;
    readonly state: 'missing' | 'issuing' | 'valid' | 'failed';
    readonly source: CertificateSourceKind;
    readonly notAfter?: string;
    readonly problem?: string;
    readonly retryAt?: string;
};

/**
 * Whether a certificate is due for renewal: a third of its lifetime remains (or it is not valid now).
 *
 * @private App web origin
 */
export function renewalDue(credentials: Pick<TlsCredentials, 'notBefore' | 'notAfter'>, now = Date.now()): boolean {
    const lifetime = credentials.notAfter.getTime() - credentials.notBefore.getTime();
    return now >= credentials.notAfter.getTime() - lifetime / 3 || now < credentials.notBefore.getTime();
}

/**
 * Keeps the engine's own certificate for its hostname: loads the stored one, orders a new one through ACME
 * TLS-ALPN-01 once a tunnel is ready (the CA validates through the relay), renews before expiry with backoff, and
 * presents the challenge certificate while the CA validates. Certificates and keys live in the App data directory at
 * mode 0600; a renewal applies to new connections without a restart.
 *
 * @private App web origin
 */
export class CertificateManager {
    private current?: TlsCredentials;
    private readonly challenges = new Map<string, TlsCredentials>();
    private state: CertificateView['state'] = 'missing';
    private problem?: string;
    private retryAt?: number;
    private failures = 0;
    private timer?: NodeJS.Timeout;
    private issuing?: Promise<void>;
    private stopped = false;
    private devCa?: LocalCa;

    public constructor(
        private readonly options: {
            readonly directory: string;
            readonly hostname: string;
            readonly source: CertificateSourceKind;
            readonly env: NodeJS.ProcessEnv;
            /** Whether a tunnel is ready right now (ACME orders only then). */
            readonly tunnelReady: () => boolean;
            readonly onChange: () => void;
            readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
            readonly tls?: TestTlsOptions;
        },
    ) {
        if (options.source === 'dev-ca' && !CONFORMANCE_BUILD) throw new Error('A development CA exists only in the conformance build.');
    }

    /** The hostname this manager serves. */
    public get hostname(): string {
        return this.options.hostname;
    }

    /** Loads the stored certificate (or issues from the development CA) and starts the renewal checks. */
    public async start(): Promise<void> {
        const directory = join(this.options.directory, TLS_DIRECTORY);
        await ensurePrivateDirectory(directory);
        const [chain, key] = await Promise.all([readPrivateFile(directory, `${this.options.hostname}.pem`), readPrivateFile(directory, `${this.options.hostname}.key.pem`)]);
        if (chain && key) {
            try {
                const validity = certificateValidity(chain);
                this.current = { certificatePem: chain, keyPem: key, ...validity };
                this.state = Date.now() < validity.notAfter.getTime() ? 'valid' : 'missing';
            } catch {
                this.current = undefined;
            }
        }
        if (this.options.source === 'dev-ca') this.devCa = await this.loadDevCa();
        this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
        this.timer.unref();
        this.check();
        // A development CA issues locally, so the certificate exists before any tunnel can bring a browser stream.
        if (this.options.source === 'dev-ca') await this.issuing;
    }

    /** Stops renewal checks (an issuance in flight finishes in the background). */
    public stop(): void {
        this.stopped = true;
        clearInterval(this.timer);
        this.challenges.clear();
    }

    /** A tunnel became ready: issue now if a certificate is missing or due. */
    public tunnelBecameReady(): void {
        this.check();
    }

    /** The served certificate for an SNI hostname. */
    public credentials(hostname: string): TlsCredentials | undefined {
        return hostname === this.options.hostname && this.current && Date.now() < this.current.notAfter.getTime() ? this.current : undefined;
    }

    /** The pending TLS-ALPN-01 challenge certificate for an SNI hostname. */
    public challenge(hostname: string): TlsCredentials | undefined {
        return this.challenges.get(hostname);
    }

    /** The served certificate's SHA-256 (of its DER, lowercase hex) and expiry, for `GET /security`. */
    public served(): { readonly sha256: string; readonly notAfter: string } | undefined {
        if (!this.current) return undefined;
        try {
            return { sha256: new X509Certificate(this.current.certificatePem).fingerprint256.replace(/:/g, '').toLowerCase(), notAfter: this.current.notAfter.toISOString() };
        } catch {
            return undefined;
        }
    }

    /** The state for the App page. */
    public view(): CertificateView {
        return {
            hostname: this.options.hostname,
            state: this.state,
            source: this.options.source,
            ...(this.current ? { notAfter: this.current.notAfter.toISOString() } : {}),
            ...(this.problem ? { problem: this.problem } : {}),
            ...(this.retryAt ? { retryAt: new Date(this.retryAt).toISOString() } : {}),
        };
    }

    /** Issues when missing or due, unless an issuance runs, a retry waits, or (ACME) no tunnel is ready. */
    private check(): void {
        if (this.stopped || this.issuing) return;
        if (this.current && !renewalDue(this.current)) return;
        if (this.retryAt && Date.now() < this.retryAt) return;
        if (this.options.source === 'acme' && !this.options.tunnelReady()) return;
        this.issuing = this.issue().finally(() => {
            this.issuing = undefined;
        });
    }

    /** One issuance with its bookkeeping. */
    private async issue(): Promise<void> {
        const hostname = this.options.hostname;
        this.state = 'issuing';
        this.problem = undefined;
        this.options.onChange();
        try {
            const credentials = this.options.source === 'dev-ca' ? await issueLocalLeaf(this.devCa ?? (await this.loadDevCa()), hostname) : await this.issueWithAcme(hostname);
            const directory = join(this.options.directory, TLS_DIRECTORY);
            await writePrivateFile(directory, `${hostname}.key.pem`, credentials.keyPem);
            await writePrivateFile(directory, `${hostname}.pem`, credentials.certificatePem);
            this.current = credentials;
            this.state = 'valid';
            this.failures = 0;
            this.retryAt = undefined;
            if (this.options.source === 'acme') this.options.log?.(`The engine has its own certificate for ${hostname} until ${credentials.notAfter.toISOString().slice(0, 10)}.`, 'info');
        } catch (error) {
            const delay = RETRY_DELAYS_MS[Math.min(this.failures, RETRY_DELAYS_MS.length - 1)] ?? CHECK_INTERVAL_MS;
            this.failures += 1;
            this.retryAt = Date.now() + delay;
            this.problem = errorMessage(error);
            this.state = this.current && Date.now() < this.current.notAfter.getTime() ? 'valid' : 'failed';
            this.options.log?.(`The engine could not get its certificate for ${hostname}: ${this.problem}`, 'warning');
            const retry = setTimeout(() => this.check(), delay + 1000);
            retry.unref();
        }
        this.options.onChange();
    }

    /** Orders a certificate through ACME TLS-ALPN-01 with the stored (or a new) account. */
    private async issueWithAcme(hostname: string): Promise<TlsCredentials> {
        const directory = this.options.directory;
        const directoryUrl = this.options.env.PTBK_ACME_DIRECTORY_URL || DEFAULT_ACME_DIRECTORY_URL;
        let accountKeyPem = await readPrivateFile(directory, ACME_ACCOUNT_KEY_FILE);
        if (!accountKeyPem) {
            accountKeyPem = createAcmeAccountKey().pem;
            await writePrivateFile(directory, ACME_ACCOUNT_KEY_FILE, accountKeyPem);
        }
        const accountKey = loadAcmeAccountKey(accountKeyPem);
        let stored: { directoryUrl?: string; accountUrl?: string } = {};
        try {
            stored = JSON.parse((await readPrivateFile(directory, ACME_ACCOUNT_FILE)) ?? '{}') as typeof stored;
        } catch {
            stored = {};
        }
        const client = new AcmeClient({ directoryUrl, accountKey, env: this.options.env, accountUrl: stored.directoryUrl === directoryUrl ? stored.accountUrl : undefined, tls: this.options.tls });
        const keys = await generateTlsKeyPair();
        const csr = await createCertificateRequest(hostname, keys);
        const chain = await client.issue(hostname, csr, {
            present: async (name, authorization) => {
                this.challenges.set(name, await createAcmeChallengeCertificate(name, authorization));
            },
            withdraw: (name) => {
                this.challenges.delete(name);
            },
        });
        if (client.account && client.account !== stored.accountUrl) await writePrivateFile(directory, ACME_ACCOUNT_FILE, `${JSON.stringify({ directoryUrl, accountUrl: client.account }, null, 4)}\n`);
        const keyPem = await privateKeyPem(keys.privateKey);
        return { certificatePem: chain, keyPem, ...certificateValidity(chain) };
    }

    /** The conformance build's development CA, created in the data directory on first use. */
    private async loadDevCa(): Promise<LocalCa> {
        const directory = join(this.options.directory, DEV_CA_DIRECTORY);
        await ensurePrivateDirectory(directory);
        const [certificatePem, keyPem] = await Promise.all([readPrivateFile(directory, DEV_CA_CERT_FILE), readPrivateFile(directory, DEV_CA_KEY_FILE)]);
        if (certificatePem && keyPem && Date.now() < certificateValidity(certificatePem).notAfter.getTime()) {
            return { certificatePem, keys: await importTlsKeyPair(keyPem), name: 'CN=Promptbook engine conformance CA' };
        }
        const created = await createLocalCa('Promptbook engine conformance CA');
        await writePrivateFile(directory, DEV_CA_KEY_FILE, created.keyPem);
        await writePrivateFile(directory, DEV_CA_CERT_FILE, created.ca.certificatePem);
        return created.ca;
    }
}
