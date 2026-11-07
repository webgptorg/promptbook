import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { PtbkError, errorMessage } from '../../common/errors.js';
import { ENGINE_VERSION } from '../../common/version.js';
import { HARNESS_TERMINAL_PATH } from '../../onboarding/terminal.js';
import { api, protocol, releaseTools } from '../../vendor/app-platform.js';
import { CONFORMANCE_BUILD } from '../build.js';
import { createPrivateFile, ensurePrivateDirectory, readPrivateFile, writePrivateFile } from '../files.js';
import { httpsRequest, type TestTlsOptions } from '../net.js';

/**
 * The contract's protocol and release tooling as this module uses them (the vendored bundle is untyped JavaScript).
 */
type Protocol = {
    readonly verifyRelease: (input: Record<string, unknown>, deps: Record<string, unknown>) => Promise<Verdict>;
    readonly verifyArtifact: (artifact: Artifact, bytes: Uint8Array) => Promise<{ readonly kind: string }>;
    readonly verifyManifestFiles: (manifest: Manifest, files: ReadonlyMap<string, Uint8Array>) => Promise<{ readonly kind: string }>;
    readonly satisfiesEngineApiRange: (range: string, version: string) => boolean;
    readonly compareEngineVersions: (a: string, b: string) => number;
    readonly dssePayload: (envelope: unknown) => Uint8Array;
    readonly parseRevocationList: (bytes: Uint8Array) => { readonly revoked: readonly { readonly version: string }[] } | undefined;
    readonly SignedRelease: { safeParse: (value: unknown) => { success: boolean; data?: { envelope: { payloadType: string } } } };
    readonly DsseEnvelope: { safeParse: (value: unknown) => { success: boolean; data?: { payloadType: string } } };
    readonly UiBundleManifest: { safeParse: (value: unknown) => { success: boolean; data?: Manifest } };
    readonly ConformanceTrustFile: { parse: (value: unknown) => { trustPolicy: unknown; trustedRoot: unknown } };
    readonly RELEASE_PAYLOAD_TYPE: string;
    readonly REVOCATION_PAYLOAD_TYPE: string;
    readonly UI_BUNDLE_ENTRY: string;
};
type ReleaseTools = {
    readonly readUiArchive: (archive: Uint8Array) => { readonly manifestBytes: Uint8Array; readonly files: ReadonlyMap<string, Uint8Array> };
    readonly createSigstoreProvenanceVerifier: (trustedRoot: unknown) => ProvenanceVerifier;
    readonly checkTrustedRoot: (bytes: Uint8Array) => { readonly kind: 'ok'; readonly root: unknown } | { readonly kind: 'invalid'; readonly reason: string };
};
const P = protocol as unknown as Protocol;
const T = releaseTools as unknown as ReleaseTools;

/**
 * One artifact of a release entry.
 */
type Artifact = { readonly kind: string; readonly name: string; readonly sha256: string };

/**
 * A UI bundle manifest (parsed strictly by the contract).
 */
type Manifest = { readonly version: string; readonly commit: string; readonly engineApi: string; readonly entry: string; readonly files: readonly { readonly path: string; readonly size: number; readonly sha256: string }[] };

/**
 * The verdict of `verifyRelease`.
 */
type Verdict = { readonly kind: string; readonly entry?: { readonly version: string; readonly commit: string; readonly artifacts: readonly Artifact[] }; readonly eligibleAt?: Date; readonly reason?: string; readonly revocationsIssuedAt?: string };

/**
 * The provenance port of `verifyRelease`.
 */
type ProvenanceVerifier = { verifyProvenance: (bundle: unknown, envelope: unknown, expected: unknown, signal?: AbortSignal) => Promise<{ readonly kind: string; readonly logIndex?: number }> };

/**
 * Store limits of the release mirror layout v1.
 */
const LIMITS = { latestBytes: 1024, releaseBytes: 256 * 1024, revocationsBytes: 2 * 1024 * 1024, artifactBytes: 200 * 1024 * 1024, timeoutMs: 15_000, artifactTimeoutMs: 300_000 };

/**
 * How often the loader checks for a newer UI release after the startup check (`auto` and `pinned`).
 */
const CHECK_INTERVAL_MS = 60 * 60_000;

/**
 * How many release payloads' first-seen times are kept (oldest dropped first).
 */
const MAX_FIRST_SEEN = 1_000;

/**
 * The loader's directory in the App data directory.
 */
const UI_DIRECTORY = 'ui';

/**
 * The variable of the conformance build's test trust.
 *
 * @private App UI loader
 */
export const CONFORMANCE_TRUST_FILE_ENV = 'PTBK_CONFORMANCE_TRUST_FILE';

/**
 * The owner's update policy for the UI (`PTBK_UPDATE_POLICY`, `PTBK_PINNED_VERSION`).
 *
 * @private App UI loader
 */
export type UiUpdatePolicy = { readonly kind: 'auto' } | { readonly kind: 'manual' } | { readonly kind: 'pinned'; readonly version: string };

/**
 * An installed, verified bundle.
 */
type InstalledBundle = { readonly version: string; readonly sha256: string; readonly logIndex: number; /** The bundle's directory name inside the loader directory. */ readonly directory: string; readonly manifest: Manifest };

/**
 * A bundle directory name the loader wrote (`<version>-<sha256 prefix>`): never a path.
 */
const BUNDLE_DIRECTORY = /^[0-9A-Za-z.+-]+-[0-9a-f]{12}$/;

/**
 * The persisted loader state: which bundle is active and which is kept as the previous one, when each release payload
 * was first seen, and the latest accepted revocation list.
 */
type LoaderState = { v: 1; active?: InstalledBundle; previous?: InstalledBundle; firstSeen: Record<string, string>; lastAcceptedRevocationIssuedAt?: string };

/**
 * The outcome of the last check, as `GET /security` → `ui.lastUpdateCheck` shows it.
 *
 * @private App UI loader
 */
export type UiUpdateCheckView = { readonly at: string; readonly outcome: 'up-to-date' | 'installed' | 'refused' | 'unavailable'; readonly version: string | null; readonly reason: string | null; readonly revocationReason: string | null; readonly eligibleAt: string | null };

/**
 * Extensions the UI may serve, with fixed types (nothing in the bundle chooses a type).
 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
    html: 'text/html; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    json: 'application/json',
    map: 'application/json',
    webmanifest: 'application/manifest+json',
    txt: 'text/plain; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    ico: 'image/x-icon',
    woff2: 'font/woff2',
    woff: 'font/woff',
    ttf: 'font/ttf',
    otf: 'font/otf',
    wasm: 'application/wasm',
};

/**
 * Content-hashed build output, whose bytes never change under its name.
 */
const HASHED_ASSET = /^assets\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;

/**
 * Whether a request path is the engine's own (API, gateway, setup, `.well-known`): a bundle never occupies it.
 *
 * @private App UI loader
 */
export function isEngineOwnedPath(path: string): boolean {
    const prefixes = [...(api.ENGINE_RESERVED_PATHS as readonly string[]), `${api.ENGINE_API_PREFIX as string}/`, HARNESS_TERMINAL_PATH];
    return prefixes.some((prefix) => {
        const bare = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
        return path === bare || path.startsWith(`${bare}/`);
    });
}

/**
 * The update policy from the environment.
 *
 * @private App UI loader
 */
export function uiUpdatePolicy(env: NodeJS.ProcessEnv): UiUpdatePolicy {
    const policy = env.PTBK_UPDATE_POLICY?.trim() || 'auto';
    if (policy === 'auto' || policy === 'manual') return { kind: policy };
    if (policy === 'pinned') {
        const version = env.PTBK_PINNED_VERSION?.trim();
        if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) throw new PtbkError('PTBK_UPDATE_POLICY=pinned needs PTBK_PINNED_VERSION, a version such as 1.4.0.', { kind: 'configuration' });
        return { kind: 'pinned', version };
    }
    throw new PtbkError('PTBK_UPDATE_POLICY must be auto, manual or pinned.', { kind: 'configuration' });
}

/**
 * SHA-256 hex of bytes.
 */
function sha256Hex(bytes: Uint8Array | string): string {
    return createHash('sha256').update(bytes).digest('hex');
}

/**
 * A time at whole seconds (the panel never shows sub-second times).
 */
function wholeSeconds(ms: number, round: 'floor' | 'ceil'): string {
    return new Date(Math[round](ms / 1000) * 1000).toISOString().replace(/\.000Z$/, 'Z');
}

/**
 * A check that could not reach the store.
 */
class Unavailable extends Error {}

/**
 * The engine UI loader: it fetches the UI release from the release store (mirror layout v1), decides with the
 * contract's `verifyRelease` (release-key signature, Sigstore provenance of the release workflow, revocation list,
 * delay, no downgrade), downloads and checks the archive, unpacks it safely, checks the manifest and every file, then
 * switches atomically, keeping the previous bundle. Any failure keeps what is served. A release build has no published
 * trust policy yet, so it serves the engine's own page; the conformance build takes the suite's test trust from
 * `PTBK_CONFORMANCE_TRUST_FILE`, which a release build refuses.
 *
 * @private App UI loader
 */
export class UiLoader {
    private state: LoaderState = { v: 1, firstSeen: {} };
    private lastCheck?: UiUpdateCheckView;
    private timer?: NodeJS.Timeout;
    private running?: Promise<void>;
    private readonly abort = new AbortController();

    private constructor(
        private readonly options: {
            readonly directory: string;
            readonly env: NodeJS.ProcessEnv;
            readonly releaseUrl?: string;
            readonly policy: UiUpdatePolicy;
            readonly trust?: { readonly policy: unknown; readonly provenance: ProvenanceVerifier };
            readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
            readonly tls?: TestTlsOptions;
        },
    ) {}

    /**
     * The loader of an App data directory. Refuses (throws, naming the variable) a conformance trust file in a release
     * build and an invalid release URL, policy or trust file.
     */
    public static async create(options: { readonly directory: string; readonly env: NodeJS.ProcessEnv; readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void; readonly tls?: TestTlsOptions }): Promise<UiLoader> {
        const { env } = options;
        const trustFile = env[CONFORMANCE_TRUST_FILE_ENV];
        if (trustFile && !CONFORMANCE_BUILD) throw new PtbkError(`${CONFORMANCE_TRUST_FILE_ENV} is set, but this is a release build of ptbk, which never takes a trust policy from its environment. Unset it.`, { kind: 'configuration' });
        let releaseUrl: string | undefined;
        if (env.PTBK_UI_RELEASE_URL) {
            let url: URL;
            try {
                url = new URL(env.PTBK_UI_RELEASE_URL);
            } catch {
                throw new PtbkError('PTBK_UI_RELEASE_URL must be an https:// URL whose path ends in /.', { kind: 'configuration' });
            }
            if (url.protocol !== 'https:' || !url.pathname.endsWith('/') || url.username || url.password || url.search || url.hash) throw new PtbkError('PTBK_UI_RELEASE_URL must be an https:// URL whose path ends in /.', { kind: 'configuration' });
            releaseUrl = url.href;
        }
        const policy = uiUpdatePolicy(env);
        let trust: { policy: unknown; provenance: ProvenanceVerifier } | undefined;
        if (trustFile) {
            let parsed: { trustPolicy: unknown; trustedRoot: unknown };
            try {
                const bytes = await readFile(trustFile);
                if (bytes.length > 2 * 1024 * 1024) throw new Error('too large');
                parsed = P.ConformanceTrustFile.parse(JSON.parse(bytes.toString('utf8')));
            } catch {
                throw new PtbkError(`${CONFORMANCE_TRUST_FILE_ENV}: ${trustFile} is not a valid conformance trust file.`, { kind: 'configuration' });
            }
            const root = T.checkTrustedRoot(new TextEncoder().encode(JSON.stringify(parsed.trustedRoot)));
            if (root.kind === 'invalid') throw new PtbkError(`${CONFORMANCE_TRUST_FILE_ENV}: ${trustFile} has an invalid trusted root (${root.reason}).`, { kind: 'configuration' });
            trust = { policy: parsed.trustPolicy, provenance: T.createSigstoreProvenanceVerifier(root.root) };
            options.log?.('This is the conformance build of ptbk: the UI loader trusts the conformance suite’s test keys.', 'warning');
        }
        return new UiLoader({ ...options, policy, ...(releaseUrl ? { releaseUrl } : {}), ...(trust ? { trust } : {}) });
    }

    /** Loads the installed bundles (each file re-checked) and runs the first check, then one every hour (not under `manual`). */
    public async start(): Promise<void> {
        const directory = join(this.options.directory, UI_DIRECTORY);
        await ensurePrivateDirectory(directory);
        const text = await readPrivateFile(directory, 'state.json');
        if (text) {
            try {
                const parsed = JSON.parse(text) as LoaderState;
                if (parsed.v !== 1 || typeof parsed.firstSeen !== 'object') throw new Error('format');
                this.state = parsed;
            } catch {
                this.options.log?.('The UI loader state was unreadable and starts empty: release delays restart and rollback protection resets.', 'error');
            }
        }
        for (const slot of ['active', 'previous'] as const) {
            const bundle = this.state[slot];
            if (bundle && !(await this.intact(bundle))) {
                this.options.log?.(`The installed UI ${bundle.version} no longer matches its manifest and is not served.`, 'error');
                delete this.state[slot];
            }
        }
        if (!this.state.active && this.state.previous) {
            this.state.active = this.state.previous;
            delete this.state.previous;
        }
        await this.save();
        // Leftovers of an interrupted install and bundles no longer kept are removed.
        const kept = new Set([this.state.active?.directory, this.state.previous?.directory]);
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.isDirectory() && !kept.has(entry.name) && (entry.name.startsWith('staging-') || BUNDLE_DIRECTORY.test(entry.name))) await this.remove(join(directory, entry.name));
        }
        // Under `manual` nothing installs by itself: a check runs only when the owner asks for one (`check()`).
        if (!this.enabled || this.options.policy.kind === 'manual') return;
        this.timer = setInterval(() => void this.check(), CHECK_INTERVAL_MS);
        this.timer.unref();
        void this.check();
    }

    /** Stops checking (a check in flight is aborted). */
    public async stop(): Promise<void> {
        clearInterval(this.timer);
        this.abort.abort();
        await this.running;
    }

    /** Whether this build can install releases (a trust policy and a store). */
    private get enabled(): boolean {
        return Boolean(this.options.trust && this.options.releaseUrl);
    }

    /** Persists the state (temporary file, fsync, rename). */
    private async save(): Promise<void> {
        await writePrivateFile(join(this.options.directory, UI_DIRECTORY), 'state.json', `${JSON.stringify(this.state, null, 2)}\n`);
    }

    /** Whether an installed bundle's files still match its manifest. */
    private async intact(bundle: InstalledBundle): Promise<boolean> {
        try {
            const files = new Map<string, Uint8Array>();
            if (!BUNDLE_DIRECTORY.test(bundle.directory)) return false;
            for (const file of bundle.manifest.files) files.set(file.path, await readFile(join(this.bundlePath(bundle), file.path)));
            const extra = await this.listFiles(this.bundlePath(bundle));
            if (extra.length !== files.size) return false;
            return (await P.verifyManifestFiles(bundle.manifest, files)).kind === 'ok';
        } catch {
            return false;
        }
    }

    /** Every file below a directory, as relative paths. */
    private async listFiles(root: string, prefix = ''): Promise<string[]> {
        const found: string[] = [];
        for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) found.push(...(await this.listFiles(root, path)));
            else found.push(path);
        }
        return found;
    }

    /** One GET from the store. */
    private async get(path: string, maxBytes: number, timeoutMs: number): Promise<{ status: number; body: Buffer }> {
        try {
            const response = await httpsRequest({ url: new URL(path, this.options.releaseUrl).href, method: 'GET', headers: { accept: 'application/json, application/octet-stream' }, maxResponseBytes: maxBytes, timeoutMs, env: this.options.env, tls: this.options.tls });
            return { status: response.status, body: response.body };
        } catch {
            throw new Unavailable(path);
        }
    }

    /** JSON from the store (undecodable JSON is handed on as `undefined`, which verification refuses). */
    private async json(path: string, maxBytes: number, missing?: 'null'): Promise<unknown> {
        const response = await this.get(path, maxBytes, LIMITS.timeoutMs);
        if (response.status === 404 && missing) return null;
        if (response.status !== 200) throw new Unavailable(path);
        try {
            return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response.body));
        } catch {
            return undefined;
        }
    }

    /** Runs one check at a time; under `manual`, this is the owner's approval (it skips only the delay). */
    public async check(): Promise<void> {
        if (!this.enabled) return;
        if (this.running) return await this.running;
        this.running = this.checkOnce().finally(() => {
            this.running = undefined;
        });
        await this.running;
    }

    /** Records the outcome of a check. */
    private record(outcome: UiUpdateCheckView['outcome'], version: string | null, details: { reason?: string; revocationReason?: string; eligibleAt?: Date } = {}): void {
        this.lastCheck = { at: wholeSeconds(Date.now(), 'floor'), outcome, version, reason: details.reason ?? null, revocationReason: details.revocationReason ?? null, eligibleAt: details.eligibleAt ? wholeSeconds(details.eligibleAt.getTime(), 'ceil') : null };
        if (outcome === 'refused') this.options.log?.(`The UI release ${version ?? ''} was refused (${details.reason ?? 'unknown'}${details.revocationReason ? `, ${details.revocationReason}` : ''}); the served UI stays as it is.`, details.reason === 'revocations-unverifiable' ? 'error' : 'warning');
    }

    /** One update check (the mock engine's `checkForUiUpdate`, ported). */
    private async checkOnce(): Promise<void> {
        const signal = this.abort.signal;
        try {
            const policy = this.options.policy;
            let version: string;
            if (policy.kind === 'pinned') version = policy.version;
            else {
                const latest = (await this.json('ui/latest.json', LIMITS.latestBytes)) as { version?: unknown } | undefined;
                if (!latest || typeof latest.version !== 'string' || Object.keys(latest).length !== 1) throw new Unavailable('latest');
                version = latest.version;
            }
            const release = await this.json(`release-log/ui-${encodeURIComponent(version)}.json`, LIMITS.releaseBytes);
            const revocations = await this.json('release-log/revocations.json', LIMITS.revocationsBytes, 'null');
            const parsed = P.SignedRelease.safeParse(release);
            const key = parsed.success && parsed.data?.envelope.payloadType === P.RELEASE_PAYLOAD_TYPE ? sha256Hex(P.dssePayload(parsed.data.envelope)) : null;
            const now = new Date();
            let firstSeenAt = now;
            if (key) {
                const stored = this.state.firstSeen[key];
                if (stored) firstSeenAt = new Date(stored);
                else {
                    this.state.firstSeen[key] = now.toISOString();
                    const keys = Object.keys(this.state.firstSeen);
                    for (const oldest of keys.slice(0, Math.max(0, keys.length - MAX_FIRST_SEEN))) delete this.state.firstSeen[oldest];
                    await this.save();
                }
            }
            const verified: { logIndex: number | null } = { logIndex: null };
            const provenance: ProvenanceVerifier = {
                verifyProvenance: async (bundle, envelope, expected, abort) => {
                    const result = await this.options.trust!.provenance.verifyProvenance(bundle, envelope, expected, abort);
                    if (result.kind === 'verified' && typeof result.logIndex === 'number') verified.logIndex = result.logIndex;
                    return result;
                },
            };
            const decide = async (): Promise<Verdict> =>
                await P.verifyRelease(
                    { release, revocations, lastAcceptedRevocationIssuedAt: this.state.lastAcceptedRevocationIssuedAt ? new Date(this.state.lastAcceptedRevocationIssuedAt) : null, policy: this.options.trust!.policy, mode: policy.kind === 'auto' ? 'auto' : 'manual', installedVersion: this.state.active?.version ?? null, firstSeenAt, signal },
                    { provenance, clock: { now: () => new Date() } },
                );
            let verdict = await decide();
            let revokedActive: string | null = null;
            if (verdict.revocationsIssuedAt !== undefined) {
                const issuedAt = new Date(verdict.revocationsIssuedAt);
                const before = this.state.lastAcceptedRevocationIssuedAt;
                if (!before || issuedAt.getTime() > Date.parse(before)) {
                    this.state.lastAcceptedRevocationIssuedAt = issuedAt.toISOString();
                    await this.save();
                }
                revokedActive = await this.withdrawRevoked(revocations);
                if (revokedActive !== null && verdict.kind === 'not-newer') verdict = await decide();
            }
            const installed = await this.act(version, verdict, verified.logIndex);
            if (revokedActive !== null && !installed) this.record('refused', revokedActive, { reason: 'revoked' });
        } catch (error) {
            if (error instanceof Unavailable || signal.aborted) {
                this.record('unavailable', null);
                if (!signal.aborted) this.options.log?.('The UI release store could not be reached; the served UI stays as it is.', 'warning');
                return;
            }
            this.record('unavailable', null);
            this.options.log?.(`The UI update check failed: ${errorMessage(error)}`, 'warning');
        }
    }

    /** Withdraws installed bundles an accepted revocation list names; the active version withdrawn, or `null`. */
    private async withdrawRevoked(revocations: unknown): Promise<string | null> {
        const envelope = P.DsseEnvelope.safeParse(revocations);
        const list = envelope.success && envelope.data?.payloadType === P.REVOCATION_PAYLOAD_TYPE ? P.parseRevocationList(P.dssePayload(envelope.data)) : undefined;
        if (!list) return null;
        const revoked = (version: string): boolean => list.revoked.some((entry) => P.compareEngineVersions(entry.version, version) === 0);
        const active = this.state.active;
        const previous = this.state.previous;
        const activeRevoked = Boolean(active && revoked(active.version));
        if (previous && revoked(previous.version)) {
            delete this.state.previous;
            this.options.log?.(`The kept UI ${previous.version} was revoked and removed.`, 'warning');
        }
        if (!activeRevoked) {
            await this.save();
            return null;
        }
        this.state.active = this.state.previous;
        delete this.state.previous;
        await this.save();
        this.options.log?.(`The active UI ${active!.version} was revoked: it is no longer served${this.state.active ? `; the UI ${this.state.active.version} is back` : ''}.`, 'error');
        return active!.version;
    }

    /** Acts on a verdict; whether a release was installed. */
    private async act(version: string, verdict: Verdict, logIndex: number | null): Promise<boolean> {
        switch (verdict.kind) {
            case 'ok':
                break;
            case 'revocations-unverifiable':
                this.record('refused', version, { reason: 'revocations-unverifiable', ...(verdict.reason ? { revocationReason: verdict.reason } : {}) });
                return false;
            case 'not-newer': {
                const artifact = verdict.entry?.artifacts.find((candidate) => candidate.kind === 'ui');
                if (this.state.active && verdict.entry && this.state.active.version === verdict.entry.version && this.state.active.sha256 === artifact?.sha256) this.record('up-to-date', verdict.entry.version);
                else this.record('refused', version, { reason: 'not-newer' });
                return false;
            }
            case 'delay-not-elapsed':
                this.record('refused', version, { reason: 'delay-not-elapsed', ...(verdict.eligibleAt ? { eligibleAt: new Date(verdict.eligibleAt) } : {}) });
                return false;
            default:
                this.record('refused', version, { reason: verdict.kind });
                return false;
        }
        const entry = verdict.entry!;
        if (logIndex === null) throw new Error('verifyRelease accepted a release without verified provenance');
        const artifact = entry.artifacts.find((candidate) => candidate.kind === 'ui');
        if (!artifact) {
            this.record('refused', version, { reason: 'invalid-entry' });
            return false;
        }
        const download = await this.get(`ui/${encodeURIComponent(entry.version)}/${encodeURIComponent(artifact.name)}`, LIMITS.artifactBytes, LIMITS.artifactTimeoutMs);
        if (download.status !== 200) throw new Unavailable('artifact');
        const archive = new Uint8Array(download.body);
        if ((await P.verifyArtifact(artifact, archive)).kind !== 'ok') {
            this.record('refused', version, { reason: 'hash-mismatch' });
            return false;
        }
        let unpacked: { manifestBytes: Uint8Array; files: ReadonlyMap<string, Uint8Array> };
        try {
            unpacked = T.readUiArchive(archive);
        } catch (error) {
            this.options.log?.(`The UI archive ${entry.version} could not be unpacked safely: ${errorMessage(error)}`, 'warning');
            this.record('refused', version, { reason: 'unpack' });
            return false;
        }
        let manifest: Manifest | undefined;
        try {
            const result = P.UiBundleManifest.safeParse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(unpacked.manifestBytes)));
            manifest = result.success ? result.data : undefined;
        } catch {
            manifest = undefined;
        }
        const refused = !manifest || manifest.version !== entry.version || manifest.commit !== entry.commit || manifest.files.some((file) => isEngineOwnedPath(`/${file.path}`)) ? 'manifest' : !P.satisfiesEngineApiRange(manifest.engineApi, api.ENGINE_API_VERSION as string) ? 'engine-api' : (await P.verifyManifestFiles(manifest, unpacked.files)).kind !== 'ok' ? 'manifest' : undefined;
        if (refused || !manifest) {
            this.record('refused', version, { reason: refused ?? 'manifest' });
            return false;
        }
        const bundle = await this.install(entry.version, artifact.sha256, logIndex, manifest, unpacked.files);
        if (this.state.active && this.state.active.directory !== bundle.directory) {
            const dropped = this.state.previous;
            this.state.previous = this.state.active;
            if (dropped && dropped.directory !== bundle.directory) await this.remove(this.bundlePath(dropped));
        }
        this.state.active = bundle;
        await this.save();
        this.record('installed', entry.version);
        this.options.log?.(`The engine UI ${entry.version} is verified and served (release log index ${String(logIndex)}).`, 'info');
        return true;
    }

    /** Writes a verified bundle into a new read-only directory (staging, then rename). */
    private async install(version: string, sha256: string, logIndex: number, manifest: Manifest, files: ReadonlyMap<string, Uint8Array>): Promise<InstalledBundle> {
        const root = join(this.options.directory, UI_DIRECTORY);
        const staging = join(root, `staging-${randomBytes(6).toString('hex')}`);
        const name = `${version}-${sha256.slice(0, 12)}`;
        const target = join(root, name);
        try {
            for (const file of manifest.files) {
                const path = join(staging, file.path);
                await mkdir(dirname(path), { recursive: true, mode: 0o700 });
                await createPrivateFile(dirname(path), basename(path), files.get(file.path)!);
            }
            await this.remove(target);
            await rename(staging, target);
            await this.makeReadOnly(target);
        } catch (error) {
            await this.remove(staging);
            throw error;
        }
        return { version, sha256, logIndex, directory: name, manifest };
    }

    /** Where an installed bundle's files are. */
    private bundlePath(bundle: InstalledBundle): string {
        return join(this.options.directory, UI_DIRECTORY, bundle.directory);
    }

    /** Removes a bundle or staging directory (its read-only directories made writable first); never throws. */
    private async remove(path: string): Promise<void> {
        const writable = async (current: string): Promise<void> => {
            const stats = await stat(current);
            if (!stats.isDirectory()) return;
            await chmod(current, 0o700);
            for (const entry of await readdir(current)) await writable(join(current, entry));
        };
        await writable(path).catch(() => undefined);
        await rm(path, { recursive: true, force: true }).catch(() => undefined);
    }

    /** Files 0400, directories 0500. */
    private async makeReadOnly(path: string): Promise<void> {
        const stats = await stat(path);
        if (stats.isDirectory()) {
            for (const entry of await readdir(path)) await this.makeReadOnly(join(path, entry));
            await chmod(path, 0o500);
        } else await chmod(path, 0o400);
    }

    /**
     * Serves a request from the active bundle: only manifest files, `index.html` for documents (SPA fallback), never the
     * engine's own paths. `undefined` when no bundle is active (the caller serves the engine page).
     */
    public async serve(request: Request): Promise<Response | undefined> {
        const bundle = this.state.active;
        if (!bundle) return undefined;
        const url = new URL(request.url);
        const path = url.pathname;
        if ((request.method !== 'GET' && request.method !== 'HEAD') || isEngineOwnedPath(path)) return new Response('Not found\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
        const wanted = path === '/' ? P.UI_BUNDLE_ENTRY : path.slice(1);
        let file = bundle.manifest.files.find((candidate) => candidate.path === wanted);
        if (!file) {
            const document = (request.headers.get('accept') ?? '').toLowerCase().includes('text/html');
            if (!document || path === '/assets' || path.startsWith('/assets/')) return new Response('Not found\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
            file = bundle.manifest.files.find((candidate) => candidate.path === bundle.manifest.entry);
            if (!file) return new Response('Not found\n', { status: 404 });
        }
        const bytes = await readFile(join(this.bundlePath(bundle), file.path));
        if (sha256Hex(bytes) !== file.sha256) {
            this.options.log?.(`A file of the served UI ${bundle.version} changed on disk; it is not served.`, 'error');
            return new Response('The engine UI is damaged; restart the engine.\n', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
        }
        const extension = file.path.includes('.') ? file.path.slice(file.path.lastIndexOf('.') + 1).toLowerCase() : '';
        const cache = file.path !== P.UI_BUNDLE_ENTRY && HASHED_ASSET.test(file.path) ? 'public, max-age=31536000, immutable' : 'no-cache';
        return new Response(request.method === 'HEAD' ? null : bytes, { status: 200, headers: { 'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream', 'cache-control': cache, 'content-length': String(bytes.length) } });
    }

    /**
     * `GET /security` → `ui`: the active bundle, or the engine's own page (this ptbk version and the SHA-256 of that
     * page) while no bundle is installed.
     */
    public status(builtinPageSha256: string): Record<string, unknown> {
        const active = this.state.active;
        return {
            version: active?.version ?? ENGINE_VERSION,
            bundleSha256: active?.sha256 ?? builtinPageSha256,
            releaseLogIndex: active?.logIndex ?? null,
            releaseLogEntryUuid: null,
            lastUpdateCheck: this.lastCheck ?? null,
        };
    }
}
