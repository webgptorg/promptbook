import { createHash, randomBytes } from 'node:crypto';
import { open as openFile, readFile, rename, rm, stat } from 'node:fs/promises';
import { hostname, userInfo } from 'node:os';
import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import type { Project } from '../project/workspace.js';
import { ENCRYPTION_FORMAT, createVerifier, deriveProjectRoot, domainKey, generateRecoveryWords, newProjectSalt, normalizeRecoveryWords, open, seal, verifyRoot, type Envelope } from './crypto.js';
import { hostUnlock, type HostUnlock, type HostUnlockFacility } from './host-unlock.js';
import { IMPORT_SOURCES, type ImportedLogin, type SkippedEntry } from './import.js';

/**
 * Readiness of a project's Wallet: `empty` (never set up; nothing to unlock), `setup` (12 words for recovery are
 * shown to the owner and wait for confirmation), `ready` (unlocked in this engine's memory), `locked` (encrypted data
 * exists but this host has no working automatic unlock; one restoration with the 12 words fixes it) and
 * `unavailable` (this host cannot protect the unlock key, or the metadata is unreadable).
 *
 * @private Wallet
 */
export type WalletState = 'empty' | 'setup' | 'ready' | 'locked' | 'unavailable';

/**
 * Nonsecret view of one saved login (never its username or password; the account is a label or a masked username).
 *
 * @private Wallet
 */
export type WalletRecordView = {
    readonly id: string;
    readonly origin: string;
    readonly account: string;
    readonly updatedAt: string;
    readonly lastUsedAt?: string;
    /** Result of the last automatic sign-in with it. */
    readonly lastOutcome?: 'signed-in' | 'rejected';
};

/**
 * Nonsecret view of one pending login request (a protected secret-input action owned by the Wallet).
 *
 * @private Wallet
 */
export type WalletActionView = {
    readonly id: string;
    readonly origin: string;
    /** Account the work needs (nonsecret context from the task), when given. */
    readonly account?: string;
    /** `missing`: no saved login; `rejected`: the saved login was refused by the site; `locked`: the Wallet needs restoration first. */
    readonly problem: 'missing' | 'rejected' | 'locked';
    readonly reason: string;
    /** Tasks waiting for it. */
    readonly tasks: readonly string[];
    readonly browser?: string;
    readonly createdAt: string;
    /** How many times work requested it (deduplicated into this one action). */
    readonly requests: number;
};

/**
 * The Wallet's view in snapshots: readiness, labels and pending requests, never a secret.
 *
 * @private Wallet
 */
export type WalletView = {
    readonly state: WalletState;
    /** One-line summary for the home tile. */
    readonly summary: string;
    /** A specific setup or unlock problem of this host. */
    readonly problem?: string;
    /** The host facility protecting automatic unlock (nonsecret). */
    readonly facility?: HostUnlockFacility;
    readonly records: readonly WalletRecordView[];
    /** Saved logins that stay encrypted because the Wallet is not unlocked here (their labels are encrypted too). */
    readonly lockedRecords?: number;
    /** Owner maintenance that applies now: import, new recovery words (a working key), or an empty reset (no key). */
    readonly management?: { readonly canImport: boolean; readonly canRotate: boolean; readonly canReset: boolean };
    readonly pending: readonly WalletActionView[];
    readonly lastAction?: { readonly action: string; readonly outcome: string; readonly applied: boolean; readonly at: string };
};

/**
 * Outcome of a Wallet operation as every client reports it (never containing a secret).
 *
 * @private Wallet
 */
export type WalletOutcome = { readonly action: string; readonly applied: boolean; readonly outcome: string };

/**
 * What a login page must offer the Wallet: the actual origin of the page (from the browser, never from an agent or the
 * page text) and trusted entry of the credentials, whose result is verified on the page.
 *
 * @private Wallet
 */
export type SignInPage = {
    readonly browser: string;
    /** Origin of the page now open, and whether it shows a login form. */
    readonly inspect: () => Promise<{ readonly origin: string; readonly form: 'password' | 'username' | 'none' }>;
    /**
     * Enters the credentials of their origin (only while the page is on it; not recorded, never returned), submits and
     * verifies the resulting session.
     */
    readonly signIn: (credentials: { readonly origin: string; readonly username: string; readonly password: string }) => Promise<SignInAttempt>;
};

/**
 * Verified result of entering credentials on a page.
 *
 * @private Wallet
 */
export type SignInAttempt = { readonly result: 'signed-in' | 'rejected' | 'challenge' | 'no-form'; readonly note?: string };

/**
 * What the agent learns from a login request: a redacted outcome plus nonsecret context.
 *
 * @private Wallet
 */
export type WalletLoginResult =
    | { readonly status: 'signed-in'; readonly origin: string; readonly account: string; readonly note?: string }
    | { readonly status: 'no-login-form'; readonly origin: string }
    | { readonly status: 'challenge'; readonly origin: string; readonly account: string; readonly note?: string }
    | { readonly status: 'ambiguous'; readonly origin: string; readonly accounts: readonly string[] }
    | { readonly status: 'waiting'; readonly origin: string; readonly action: string; readonly problem: WalletActionView['problem']; readonly reason: string }
    | { readonly status: 'failed'; readonly reason: string };

/**
 * Inputs of the Wallet sub-engine.
 *
 * @private Wallet
 */
export type WalletOptions = {
    readonly project: Project;
    readonly env: NodeJS.ProcessEnv;
    readonly onChange: () => void;
    /** A pending login action was resolved or dismissed (waiting work may resume). */
    readonly onSettled?: () => void;
    readonly log: (text: string, level?: 'info' | 'warning' | 'error') => void;
    /** Host facility (tests inject one). */
    readonly unlock?: HostUnlock;
    /**
     * Nonsecret Git audit of meaningful mutations (`wallet.isAuditCommitted`, default on). `isEnabled` is read at each
     * mutation; `commit` creates one scoped audit commit, empty when no file changes.
     */
    readonly audit?: { readonly isEnabled: () => boolean; readonly commit: (subject: string, body: string) => Promise<void> };
};

/**
 * A nonsecret audit record of a successful Wallet mutation whose commit is still pending (retried without repeating
 * the mutation).
 */
type PendingAudit = { readonly subject: string; readonly body: string; readonly at: string; readonly failure?: string };

/**
 * Write-once encryption metadata of a project (`.ptbk/encryption/project.json`): everything except the 12 words that
 * is needed to reproduce the keys on any host.
 */
type EncryptionMetadata = {
    readonly format: typeof ENCRYPTION_FORMAT;
    readonly projectKeyId: string;
    readonly createdAt: string;
    readonly salt: string;
    readonly derivation: {
        readonly words: string;
        readonly seed: string;
        readonly root: string;
        readonly domains: string;
        readonly encryption: string;
    };
    readonly verifier: Envelope;
};

/**
 * Host bindings of the automatic unlock (`.ptbk/encryption/hosts.json`): the project root wrapped by a secret that only
 * the host facility holds, under a nonsecret reference.
 */
type HostBindings = {
    readonly projectKeyId: string;
    readonly hosts: Readonly<Record<string, { readonly facility: HostUnlockFacility; readonly reference: string; readonly wrappedRoot: Envelope; readonly at: string }>>;
};

/**
 * One saved login in this engine's memory while the Wallet is unlocked: its labels for views and matching plus the
 * encrypted credentials. On disk nothing of it is plaintext (see {@link SealedRecord}).
 */
type StoredRecord = {
    readonly id: string;
    readonly origin: string;
    readonly account: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly lastUsedAt?: string;
    readonly lastOutcome?: 'signed-in' | 'rejected';
    readonly secret: Envelope;
};

/**
 * One persisted login request.
 */
type StoredAction = WalletActionView & { readonly state: 'pending' | 'resolved' | 'dismissed'; readonly settledAt?: string; readonly record?: string };

/**
 * Decrypted content of a record (only inside the Wallet and the trusted sign-in).
 */
type Credentials = { readonly origin: string; readonly username: string; readonly password: string; readonly totp?: string };

/**
 * The complete content of one record as it is encrypted on disk: service, account, label, times and secrets alike.
 */
type RecordContent = Credentials & { readonly label: string; readonly createdAt: string; readonly updatedAt: string; readonly lastUsedAt?: string; readonly lastOutcome?: 'signed-in' | 'rejected' };

/**
 * One record on disk (`records.json`, version 2): an id and its entirely encrypted content, with no plaintext account
 * or origin index.
 */
type SealedRecord = { readonly id: string; readonly sealed: Envelope };

/**
 * A protected import preview of one login (never a password or generator secret).
 *
 * @private Wallet
 */
export type WalletImportCandidate = {
    readonly key: string;
    readonly label: string;
    readonly origin: string;
    /** Masked username. */
    readonly account: string;
    /** `new`, an identical `duplicate` (reused), or a `conflict` with different saved values (replaced only on request). */
    readonly state: 'new' | 'duplicate' | 'conflict';
    readonly totp: boolean;
};

/**
 * A protected import preview: the selectable logins and the honestly skipped entries of one export.
 *
 * @private Wallet
 */
export type WalletImportPreview = { readonly draft: string; readonly source: string; readonly candidates: readonly WalletImportCandidate[]; readonly skipped: readonly SkippedEntry[] };

/**
 * How long words shown for setup stay valid without confirmation (they are only in memory).
 */
const SETUP_DRAFT_MS = 30 * 60_000;

/**
 * What an empty reset loses (shown before its separate destructive confirmation).
 */
const RESET_WARNING = 'Resetting discards ALL old Wallet data for good: the list of services and accounts, labels, usernames, passwords and TOTP generators. It cannot be recovered without the old 12 words or a computer that still unlocks it. Saved logins must be added or imported again.';

/**
 * Settled login actions are kept this long (7 days; once-only resume of waiting work across restarts), then pruned.
 */
const SETTLED_RETENTION_MS = 604_800_000;

/**
 * Hex digits of the nonsecret host identity.
 */
const HOST_ID_LENGTH = 24;

/**
 * Random bytes of the nonsecret project key id.
 */
const KEY_ID_BYTES = 12;

/**
 * Bytes of the host wrapping secret (AES-256).
 */
const WRAPPING_KEY_BYTES = 32;

/**
 * Owner-only file mode of Wallet and encryption files.
 */
const PRIVATE_FILE_MODE = 0o600;

/**
 * Domain of the host-unlock wrapping envelope.
 */
const HOST_DOMAIN = 'host-unlock';

/**
 * Domain of the Wallet records.
 */
const WALLET_DOMAIN = 'wallet';

/**
 * Normalizes a website address to its origin (`https://` is assumed without a scheme).
 *
 * @private Wallet
 */
export function normalizeOrigin(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) throw new PtbkError('Name the website (for example https://example.com).', { kind: 'usage' });
    let url: URL;
    try {
        url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch {
        throw new PtbkError(`"${trimmed}" is not a website address.`, { kind: 'usage' });
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new PtbkError('The Wallet saves logins of websites (http or https) only.', { kind: 'usage' });
    return url.origin;
}

/**
 * Whether a saved origin applies to the actual page origin: the same scheme and host, where `www.` is the same site.
 * A page's text, a redirect or a lookalike host never matches another origin.
 *
 * @private Wallet
 */
export function originMatches(saved: string, actual: string): boolean {
    let a: URL;
    let b: URL;
    try {
        a = new URL(saved);
        b = new URL(actual);
    } catch {
        return false;
    }
    const host = (url: URL): string => url.host.toLowerCase().replace(/^www\./, '');
    return a.protocol === b.protocol && host(a) === host(b);
}

/**
 * The useful initial label of a saved login, derived from its service and account (`example.com · ja…@example.com`);
 * the owner can rename it. It never contains the full username or the password.
 *
 * @private Wallet
 */
export function walletLabel(origin: string, username: string): string {
    let service = origin;
    try {
        service = new URL(origin).host.replace(/^www\./, '');
    } catch {
        // Keep the given origin text.
    }
    return `${service} · ${maskAccount(username)}`;
}

/**
 * A masked username for labels (`ja…@example.com`, `jo…h`).
 *
 * @private Wallet
 */
export function maskAccount(username: string): string {
    const [local = '', domain] = username.split(/@(?=[^@]*$)/);
    const masked = local.length <= 2 ? `${local.slice(0, 1)}…` : `${local.slice(0, 2)}…${domain ? '' : local.slice(-1)}`;
    return domain ? `${masked}@${domain}` : masked;
}

/**
 * Identity of this host and OS user for automatic unlock bindings (nonsecret, stable across restarts).
 */
function hostIdentity(): string {
    let user: string;
    try {
        user = userInfo().username;
    } catch {
        user = process.env.USER ?? process.env.USERNAME ?? '';
    }
    return createHash('sha256').update(`${hostname()}\0${user}\0${process.platform}`).digest('hex').slice(0, HOST_ID_LENGTH);
}

/**
 * The project's Wallet sub-engine: a login/password manager whose records are encrypted under the project's encryption
 * root. It unlocks automatically at engine start through a host-protected secret, applies saved logins to websites on
 * behalf of agents without ever returning a password, and turns missing or rejected logins into one deduplicated,
 * persistent request for protected owner input. It works with zero viewers.
 *
 * @private Wallet
 */
export class WalletSubEngine {
    private readonly mutex = new Mutex();
    private readonly unlock: HostUnlock;
    private readonly host = hostIdentity();
    private state: WalletState = 'empty';
    private problem?: string;
    private metadata?: EncryptionMetadata;
    /** The wallet domain key, only in this engine's memory while ready. */
    private key?: Buffer;
    private records: StoredRecord[] = [];
    private actions: StoredAction[] = [];
    /**
     * Words shown for setup, only in memory until confirmed (an interrupted setup leaves nothing behind). A `reset`
     * draft replaces an unrecoverable Wallet only when it is confirmed.
     */
    private draft?: { readonly words: readonly string[]; readonly salt: Buffer; readonly expiresAt: number; readonly reset?: boolean };
    /** New words of a recovery-word replacement, only in memory until confirmed. */
    private rotation?: { readonly words: readonly string[]; readonly salt: Buffer; readonly expiresAt: number };
    /** A parsed import, only in memory until applied or cancelled (the export itself is never copied). */
    private importDraft?: { readonly id: string; readonly source: string; readonly logins: readonly ImportedLogin[]; readonly skipped: readonly SkippedEntry[]; readonly expiresAt: number };
    /** Records on disk while the Wallet is not unlocked (their content stays encrypted, so only the count is known). */
    private lockedRecords = 0;
    /** The records were read from the older format with plaintext labels: rewritten fully encrypted once unlocked. */
    private legacyRecords = false;
    private lastAction?: WalletView['lastAction'];

    public constructor(private readonly options: WalletOptions) {
        this.unlock = options.unlock ?? hostUnlock(options.env);
    }

    /** `.ptbk/encryption/`. */
    private get encryptionDirectory(): string {
        return join(this.options.project.runtime.root, 'encryption');
    }

    /** `.ptbk/wallet/`. */
    private get walletDirectory(): string {
        return join(this.options.project.runtime.root, 'wallet');
    }

    /** Readiness. */
    public get readiness(): WalletState {
        return this.draft && this.state === 'empty' ? 'setup' : this.state;
    }

    /**
     * Loads the Wallet and unlocks it automatically with this host's protected secret (no words, no master password).
     * Nothing is created for a project that never used the Wallet.
     */
    public async initialize(): Promise<void> {
        await this.mutex.run(async () => {
            this.actions = await this.readActions();
            this.pruneActions();
            await this.recoverGeneration();
            const metadata = await this.readMetadata();
            if (!metadata) return;
            this.metadata = metadata;
            await this.unlockWithHost(metadata);
            if (this.state !== 'ready') this.lockedRecords = await this.recordCount(metadata);
        });
        this.options.onChange();
    }

    /** Reads the write-once metadata (undefined when the Wallet was never set up; unreadable is `unavailable`). */
    private async readMetadata(): Promise<EncryptionMetadata | undefined> {
        let text: string;
        try {
            text = await readFile(join(this.encryptionDirectory, 'project.json'), 'utf8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                this.state = 'empty';
                return undefined;
            }
            this.fail('unavailable', `The Wallet's encryption metadata cannot be read (${errorMessage(error)}); it was not changed.`);
            return undefined;
        }
        try {
            const metadata = JSON.parse(text) as EncryptionMetadata;
            if (metadata.format !== ENCRYPTION_FORMAT) {
                this.fail('unavailable', `The Wallet uses an unsupported encryption format (${String(metadata.format)}); update Promptbook. Nothing was changed.`);
                return undefined;
            }
            if (!metadata.salt || !metadata.verifier || !metadata.projectKeyId) throw new Error('incomplete');
            return metadata;
        } catch {
            this.fail('unavailable', 'The Wallet\'s encryption metadata in .ptbk/encryption/project.json is corrupted; it was not changed. Restore it from a backup of the project folder.');
            return undefined;
        }
    }

    /** Sets a non-ready state with its explanation. */
    private fail(state: 'locked' | 'unavailable', problem: string): void {
        this.state = state;
        this.problem = problem;
        this.key = undefined;
    }

    /** Unlocks with this host's binding, else explains why this host needs one restoration. */
    private async unlockWithHost(metadata: EncryptionMetadata): Promise<void> {
        const bindings = await this.readBindings(metadata);
        const binding = bindings?.hosts[this.host];
        if (!binding) {
            this.fail('locked', 'The Wallet has saved logins, but this computer cannot unlock them yet (the project was copied or moved here). Enter the 12 words for recovery once on the Wallet page.');
            return;
        }
        if (binding.facility !== this.unlock.facility) {
            this.fail('locked', `This computer's Wallet unlock was set up with ${binding.facility}, which this engine does not use now (${this.unlock.facility}). Enter the 12 words for recovery once to set it up again.`);
            return;
        }
        const secret = await this.unlock.load(binding.reference).catch(() => undefined);
        if (!secret) {
            const problem = await this.unlock.problem().catch((error: unknown) => errorMessage(error));
            this.fail(problem ? 'unavailable' : 'locked', problem ?? "This computer's protected Wallet unlock key is missing (for example it was removed from the credential store). Enter the 12 words for recovery once to set it up again.");
            return;
        }
        try {
            const root = open(secret, HOST_DOMAIN, binding.wrappedRoot);
            const salt = Buffer.from(metadata.salt, 'base64');
            if (!verifyRoot(root, salt, metadata.verifier)) throw new Error('verifier');
            this.key = domainKey(root, salt, WALLET_DOMAIN);
            root.fill(0);
        } catch {
            this.fail('locked', "This computer's Wallet unlock does not match the project's encrypted data. Enter the 12 words for recovery once to set it up again.");
            return;
        } finally {
            secret.fill(0);
        }
        this.records = await this.readRecords(metadata);
        this.state = 'ready';
        this.problem = undefined;
        this.lockedRecords = 0;
        await this.migrateRecords();
    }

    /** Rewrites records of the older format (plaintext labels) entirely encrypted, once the Wallet is unlocked. */
    private async migrateRecords(): Promise<void> {
        if (!this.legacyRecords || this.state !== 'ready') return;
        await this.writeRecords();
        this.legacyRecords = false;
        this.options.log('Wallet: saved logins are now encrypted completely (service, account and label included).');
    }

    /** Number of records on disk (readable without the key). */
    private async recordCount(metadata: EncryptionMetadata): Promise<number> {
        try {
            const file = JSON.parse(await readFile(join(this.walletDirectory, 'records.json'), 'utf8')) as { projectKeyId?: string; records?: unknown[] };
            return file.projectKeyId === metadata.projectKeyId && Array.isArray(file.records) ? file.records.length : 0;
        } catch {
            return 0;
        }
    }

    /** Host bindings of this project (an unreadable file is treated as having none; it is replaced on restoration). */
    private async readBindings(metadata: EncryptionMetadata): Promise<HostBindings | undefined> {
        try {
            const bindings = JSON.parse(await readFile(join(this.encryptionDirectory, 'hosts.json'), 'utf8')) as HostBindings;
            return bindings.projectKeyId === metadata.projectKeyId ? bindings : undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Saved records, decrypted into memory with the unlocked key (their whole content is encrypted on disk); records of
     * another project key are not this vault's. Records of the older format are recognized and migrated.
     */
    private async readRecords(metadata: EncryptionMetadata): Promise<StoredRecord[]> {
        let file: { projectKeyId?: string; records?: Array<StoredRecord | SealedRecord> };
        try {
            file = JSON.parse(await readFile(join(this.walletDirectory, 'records.json'), 'utf8')) as typeof file;
        } catch {
            return [];
        }
        if (file.projectKeyId !== metadata.projectKeyId || !Array.isArray(file.records)) return [];
        const key = this.key;
        if (!key) return [];
        const records: StoredRecord[] = [];
        for (const entry of file.records) {
            if ('sealed' in entry) {
                try {
                    const content = JSON.parse(open(key, WALLET_DOMAIN, entry.sealed).toString('utf8')) as RecordContent;
                    const credentials: Credentials = { origin: content.origin, username: content.username, password: content.password, ...(content.totp ? { totp: content.totp } : {}) };
                    records.push({
                        id: entry.id,
                        origin: content.origin,
                        account: content.label,
                        createdAt: content.createdAt,
                        updatedAt: content.updatedAt,
                        ...(content.lastUsedAt ? { lastUsedAt: content.lastUsedAt } : {}),
                        ...(content.lastOutcome ? { lastOutcome: content.lastOutcome } : {}),
                        secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify(credentials), 'utf8')),
                    });
                } catch {
                    this.options.log(`Wallet: one saved login could not be decrypted and is not used (${entry.id}).`, 'warning');
                }
            } else {
                records.push(entry);
                this.legacyRecords = true;
            }
        }
        return records;
    }

    /** Persisted login actions. */
    private async readActions(): Promise<StoredAction[]> {
        try {
            const file = JSON.parse(await readFile(join(this.walletDirectory, 'actions.json'), 'utf8')) as { actions?: StoredAction[] };
            return Array.isArray(file.actions) ? file.actions : [];
        } catch {
            return [];
        }
    }

    /** Drops long-settled actions. */
    private pruneActions(): void {
        const cutoff = Date.now() - SETTLED_RETENTION_MS;
        this.actions = this.actions.filter((action) => action.state === 'pending' || Date.parse(action.settledAt ?? action.createdAt) > cutoff);
    }

    /**
     * Writes the records atomically (owner-only), each entirely encrypted: service, account, label, times and secrets
     * (no plaintext index).
     */
    private async writeRecords(): Promise<void> {
        await ensureDirectory(this.walletDirectory);
        if (!this.key || !this.metadata) throw new PtbkError('The Wallet is not unlocked; nothing was saved.', { kind: 'setup' });
        await writeJsonAtomic(join(this.walletDirectory, 'records.json'), this.sealedRecords(this.key, this.metadata.projectKeyId), { mode: PRIVATE_FILE_MODE });
    }

    /** The on-disk form of the records under a key (also for a new generation's key). */
    private sealedRecords(key: Buffer, projectKeyId: string): { format: string; version: 2; projectKeyId: string; records: SealedRecord[] } {
        const records = this.records.map((record): SealedRecord => {
            const content: RecordContent = { ...this.credentials(record), label: record.account, createdAt: record.createdAt, updatedAt: record.updatedAt, ...(record.lastUsedAt ? { lastUsedAt: record.lastUsedAt } : {}), ...(record.lastOutcome ? { lastOutcome: record.lastOutcome } : {}) };
            return { id: record.id, sealed: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify(content), 'utf8')) };
        });
        return { format: ENCRYPTION_FORMAT, version: 2, projectKeyId, records };
    }

    /** Writes the login actions atomically (nonsecret). */
    private async writeActions(): Promise<void> {
        await ensureDirectory(this.walletDirectory);
        await writeJsonAtomic(join(this.walletDirectory, 'actions.json'), { actions: this.actions }, { mode: PRIVATE_FILE_MODE });
    }

    /** Records the last management action (for the page). */
    private remember(outcome: WalletOutcome): WalletOutcome {
        this.lastAction = { ...outcome, at: new Date().toISOString() };
        this.options.onChange();
        return outcome;
    }

    /**
     * Starts the first setup: 12 words for recovery from OS randomness, kept only in memory and returned only to the
     * owner's protected setup surface. Calling it again during setup returns the same words.
     */
    public async beginSetup(): Promise<{ readonly words: readonly string[] }> {
        return await this.mutex.run(async () => {
            if (this.metadata || this.state !== 'empty') throw new PtbkError(this.state === 'ready' ? 'The Wallet is already set up.' : 'This project already has encrypted Wallet data; restore it with its 12 words for recovery instead of setting up a new one.', { kind: 'conflict', effect: 'Nothing was changed.' });
            const problem = await this.unlock.problem();
            if (problem) {
                this.problem = problem;
                this.options.onChange();
                throw new PtbkError(problem, { kind: 'setup', effect: 'The Wallet was not set up; other work continues.' });
            }
            if (!this.draft || this.draft.expiresAt < Date.now()) this.draft = { words: generateRecoveryWords(), salt: newProjectSalt(), expiresAt: Date.now() + SETUP_DRAFT_MS };
            this.options.onChange();
            return { words: [...this.draft.words] };
        });
    }

    /** Abandons a setup whose words were shown (nothing was written). */
    public cancelSetup(): WalletOutcome {
        const had = Boolean(this.draft);
        this.draft = undefined;
        return this.remember({ action: 'wallet-setup-cancel', applied: had, outcome: had ? 'Wallet setup cancelled; nothing was saved.' : 'No Wallet setup was in progress.' });
    }

    /**
     * Completes the setup after the owner wrote the words down: derives the root, writes the write-once metadata (never
     * over an existing vault) and provisions this host's automatic unlock.
     */
    public async confirmSetup(): Promise<WalletOutcome> {
        const reset = Boolean(this.draft?.reset);
        const outcome = await this.mutex.run(async (): Promise<WalletOutcome> => {
            const draft = this.draft;
            if (!draft || draft.expiresAt < Date.now()) {
                this.draft = undefined;
                return { action: 'wallet-setup-confirm', applied: false, outcome: 'No Wallet setup is waiting for confirmation (it expires after 30 minutes); start it again.' };
            }
            // A confirmed reset replaces the unrecoverable Wallet only now, with the new words written down.
            if (draft.reset) await this.discardUnrecoverable();
            const root = deriveProjectRoot(draft.words, draft.salt);
            try {
                const metadata: EncryptionMetadata = {
                    format: ENCRYPTION_FORMAT,
                    projectKeyId: randomBytes(KEY_ID_BYTES).toString('hex'),
                    createdAt: new Date().toISOString(),
                    salt: draft.salt.toString('base64'),
                    derivation: {
                        words: '12 words for recovery: 128 bits of OS randomness, standard English word list with checksum',
                        seed: 'UTF-8 NFKD; PBKDF2-HMAC-SHA512, 2048 iterations, 64 bytes, empty passphrase',
                        root: 'HKDF-SHA256(seed, salt, "promptbook/project-root/v1"), 32 bytes',
                        domains: 'HKDF-SHA256(root, salt, "promptbook/domain/<domain>/v1"), 32 bytes',
                        encryption: `AES-256-GCM, 96-bit random nonce, authenticated data "${ENCRYPTION_FORMAT}|<domain>"`,
                    },
                    verifier: createVerifier(root, draft.salt),
                };
                await ensureDirectory(this.encryptionDirectory);
                // Write-once: an existing vault is never overwritten (a concurrent or earlier setup wins).
                const handle = await openFile(join(this.encryptionDirectory, 'project.json'), 'wx', PRIVATE_FILE_MODE).catch((error: unknown) => {
                    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new PtbkError('This project already has encrypted Wallet data; nothing was overwritten.', { kind: 'conflict', next: ['Restore it with its 12 words for recovery.'] });
                    throw error;
                });
                try {
                    await handle.writeFile(`${JSON.stringify(metadata, null, 4)}\n`);
                    await handle.sync();
                } finally {
                    await handle.close();
                }
                this.metadata = metadata;
                await this.provisionHost(metadata, root);
                this.key = domainKey(root, draft.salt, WALLET_DOMAIN);
                this.records = [];
                await this.writeRecords();
                this.state = 'ready';
                this.problem = undefined;
                this.draft = undefined;
                return { action: 'wallet-setup-confirm', applied: true, outcome: `The Wallet is set up; this computer unlocks it automatically (${this.unlock.facility}). Keep the 12 words for recovery safe.` };
            } finally {
                root.fill(0);
            }
        });
        if (outcome.applied) this.options.log(`Wallet: set up with automatic unlock through ${this.unlock.facility}.`);
        if (outcome.applied && reset) await this.recordAudit({ subject: 'Wallet - Reset to a new empty Wallet', body: 'Replaced a Wallet that no key or recovery words could unlock with a new, empty encrypted Wallet and new 12 words for recovery.\nThe old saved logins could not be read and were discarded. Words, keys and the encrypted vault are never committed.' });
        return this.remember(outcome);
    }

    /** Stores a fresh wrapping secret in the host facility and the wrapped root in the project (this host's binding). */
    private async provisionHost(metadata: EncryptionMetadata, root: Buffer): Promise<void> {
        const problem = await this.unlock.problem();
        if (problem) throw new PtbkError(problem, { kind: 'setup', effect: 'Automatic unlock was not set up on this computer.' });
        const reference = `ptbk-${metadata.projectKeyId.slice(0, 8)}-${randomBytes(6).toString('hex')}`;
        const secret = randomBytes(WRAPPING_KEY_BYTES);
        try {
            await this.unlock.store(reference, secret);
            const previous = (await this.readBindings(metadata))?.hosts ?? {};
            const replaced = previous[this.host];
            await writeJsonAtomic(join(this.encryptionDirectory, 'hosts.json'), { projectKeyId: metadata.projectKeyId, hosts: { ...previous, [this.host]: { facility: this.unlock.facility, reference, wrappedRoot: seal(secret, HOST_DOMAIN, root), at: new Date().toISOString() } } } satisfies HostBindings, { mode: PRIVATE_FILE_MODE });
            if (replaced && replaced.reference !== reference && replaced.facility === this.unlock.facility) await this.unlock.remove(replaced.reference).catch(() => undefined);
        } finally {
            secret.fill(0);
        }
    }

    /**
     * Restores this host's automatic unlock from the 12 words for recovery: they must match the project's existing
     * encrypted data (verified before anything changes). Saved logins need not be entered again.
     */
    public async restore(words: string): Promise<WalletOutcome> {
        const outcome = await this.mutex.run(async (): Promise<WalletOutcome> => {
            const metadata = this.metadata ?? (await this.readMetadata());
            if (!metadata) throw new PtbkError('This project has no encrypted Wallet data to restore; the 12 words alone do not contain saved logins. Set up the Wallet instead.', { kind: 'not-found', effect: 'Nothing was changed.' });
            const normalized = normalizeRecoveryWords(words);
            const salt = Buffer.from(metadata.salt, 'base64');
            const root = deriveProjectRoot(normalized, salt);
            try {
                if (!verifyRoot(root, salt, metadata.verifier)) throw new PtbkError("These 12 words do not belong to this project's Wallet.", { kind: 'conflict', effect: 'Nothing was changed; the saved logins are preserved.' });
                this.metadata = metadata;
                await this.provisionHost(metadata, root);
                this.key = domainKey(root, salt, WALLET_DOMAIN);
            } finally {
                root.fill(0);
            }
            this.records = await this.readRecords(metadata);
            this.state = 'ready';
            this.problem = undefined;
            this.lockedRecords = 0;
            await this.migrateRecords();
            const locked = this.actions.filter((action) => action.state === 'pending' && action.problem === 'locked');
            for (const action of locked) this.settle(action.id, 'resolved');
            if (locked.length) await this.writeActions();
            return { action: 'wallet-restore', applied: true, outcome: `The Wallet is restored on this computer (${this.records.length} saved login${this.records.length === 1 ? '' : 's'}); it unlocks automatically from now on.` };
        });
        this.options.log('Wallet: restored on this computer with the 12 words for recovery.');
        if (outcome.applied) this.options.onSettled?.();
        return this.remember(outcome);
    }

    // ── Import (one shared protected importer; Bitwarden is the first source) ──

    /**
     * Parses an export the owner supplied through a protected local surface into a preview: selectable logins with
     * their state against the saved ones (new, identical duplicate, conflict) and honestly skipped entries. The export
     * stays in memory only; nothing is saved before the owner's selection is applied.
     */
    public async previewImport(input: { readonly source?: string; readonly content: string }): Promise<WalletImportPreview> {
        return await this.mutex.run(async () => {
            this.requireReady();
            const source = IMPORT_SOURCES[input.source ?? 'bitwarden'];
            if (!source) throw new PtbkError(`Importing from ${input.source} is not supported.`, { kind: 'unsupported', next: ['Use a Bitwarden JSON export.'] });
            const extraction = source.extract(input.content, normalizeOrigin);
            this.importDraft = { id: randomBytes(6).toString('hex'), source: extraction.source, logins: extraction.logins, skipped: extraction.skipped, expiresAt: Date.now() + SETUP_DRAFT_MS };
            this.options.onChange();
            return this.importPreview();
        });
    }

    /** The preview of the current import draft, evaluated against the saved logins now. */
    private importPreview(): WalletImportPreview {
        const draft = this.importDraft!;
        const seen = new Set<string>();
        const candidates = draft.logins.map((login): WalletImportCandidate => {
            const identity = `${login.origin}|${login.username.toLowerCase()}`;
            const state = seen.has(identity) ? 'duplicate' : this.importState(login);
            seen.add(identity);
            return { key: login.key, label: login.label || walletLabel(login.origin, login.username), origin: login.origin, account: maskAccount(login.username), state, totp: Boolean(login.totp) };
        });
        return { draft: draft.id, source: draft.source, candidates, skipped: draft.skipped };
    }

    /** How an imported login relates to the saved ones: the same service and account decide identity, never the label. */
    private importState(login: ImportedLogin): WalletImportCandidate['state'] {
        const existing = this.matchingRecord(login.origin, login.username);
        if (!existing) return 'new';
        const saved = this.credentials(existing);
        return saved.password === login.password && (saved.totp ?? '') === (login.totp ?? '') ? 'duplicate' : 'conflict';
    }

    /** The saved record of one service and account, if any. */
    private matchingRecord(origin: string, username: string): StoredRecord | undefined {
        return this.records.find((record) => originMatches(record.origin, origin) && this.usernameOf(record)?.toLowerCase() === username.toLowerCase());
    }

    /**
     * Applies the owner's selection of one import draft in one revision-safe write: new logins are added, identical
     * duplicates reused, conflicting ones replaced only when the owner chose replacement, everything else kept. One
     * nonsecret audit summarizes the import; a selection that changes nothing creates none.
     */
    public async applyImport(input: { readonly draft: string; readonly select: readonly string[]; readonly replace?: readonly string[] }): Promise<WalletOutcome & { readonly imported: number; readonly reused: number; readonly skipped: number; readonly replaced: number }> {
        const result = await this.mutex.run(async () => {
            const key = this.requireReady();
            const draft = this.importDraft;
            if (!draft || draft.id !== input.draft || draft.expiresAt < Date.now()) throw new PtbkError('This import preview is no longer current (it expires after 30 minutes); read the export again.', { kind: 'conflict', effect: 'Nothing was imported.' });
            const selected = new Set(input.select);
            const replace = new Set(input.replace ?? []);
            const now = new Date().toISOString();
            const added: StoredRecord[] = [];
            const changed: StoredRecord[] = [];
            let reused = 0;
            let skipped = 0;
            const done = new Set<string>();
            for (const login of draft.logins) {
                if (!selected.has(login.key)) continue;
                const identity = `${login.origin}|${login.username.toLowerCase()}`;
                if (done.has(identity)) {
                    reused++;
                    continue;
                }
                done.add(identity);
                const credentials: Credentials = { origin: login.origin, username: login.username, password: login.password, ...(login.totp ? { totp: login.totp } : {}) };
                const existing = this.matchingRecord(login.origin, login.username);
                const state = this.importState(login);
                if (state === 'duplicate') reused++;
                else if (state === 'conflict' && existing) {
                    if (!replace.has(login.key)) {
                        skipped++;
                        continue;
                    }
                    const updated: StoredRecord = { ...existing, updatedAt: now, lastOutcome: undefined, secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify(credentials), 'utf8')) };
                    this.records = this.records.map((record) => (record.id === existing.id ? updated : record));
                    changed.push(updated);
                } else {
                    const record: StoredRecord = { id: randomBytes(6).toString('hex'), origin: login.origin, account: login.label || walletLabel(login.origin, login.username), createdAt: now, updatedAt: now, secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify(credentials), 'utf8')) };
                    this.records = [...this.records, record];
                    added.push(record);
                }
            }
            this.importDraft = undefined;
            if (added.length || changed.length) await this.writeRecords();
            let settled = 0;
            for (const record of [...added, ...changed]) {
                for (const pending of this.actions.filter((action) => action.state === 'pending' && originMatches(action.origin, record.origin))) {
                    this.settle(pending.id, 'resolved', record.id);
                    settled++;
                }
            }
            if (settled) await this.writeActions();
            const count = (amount: number, noun: string): string => `${amount} ${noun}${amount === 1 ? '' : 's'}`;
            const parts = [added.length ? `imported ${count(added.length, 'login')}` : '', changed.length ? `replaced ${changed.length}` : '', reused ? `reused ${reused} identical` : '', skipped ? `kept ${skipped} conflicting saved login${skipped === 1 ? '' : 's'}` : ''].filter(Boolean);
            const outcome = parts.length ? `${draft.source}: ${parts.join(', ')}.${settled ? ` ${settled === 1 ? 'A waiting request was' : `${settled} waiting requests were`} resolved.` : ''} Delete the export file safely now; Promptbook kept no copy. Imported logins are used automatically, but a login is only verified when a website accepts it.` : `${draft.source}: nothing was imported.`;
            const audit =
                added.length || changed.length
                    ? {
                          subject: `Wallet - Import ${count(added.length + changed.length, 'login')} from ${draft.source}`,
                          body: [
                              `Imported into the encrypted project Wallet from a ${draft.source} export:`,
                              ...[...added.map((record) => `- added "${record.account}" for ${record.origin}`), ...changed.map((record) => `- replaced "${record.account}" for ${record.origin}`)],
                              ...(reused || skipped ? [`Reused ${reused} identical and kept ${skipped} conflicting saved login(s).`] : []),
                              'The export, secret values and the encrypted vault are never committed.',
                          ].join('\n'),
                      }
                    : undefined;
            return { outcome: { action: 'wallet-import', applied: Boolean(added.length || changed.length), outcome, imported: added.length, reused, skipped, replaced: changed.length }, settled, audit };
        });
        if (result.outcome.applied) this.options.log(`Wallet: ${result.outcome.outcome}`);
        if (result.settled) this.options.onSettled?.();
        if (result.audit) await this.recordAudit(result.audit);
        this.remember(result.outcome);
        return result.outcome;
    }

    /** Discards an import preview (nothing was saved). */
    public cancelImport(): WalletOutcome {
        const had = Boolean(this.importDraft);
        this.importDraft = undefined;
        return this.remember({ action: 'wallet-import-cancel', applied: had, outcome: had ? 'Import cancelled; nothing was saved.' : 'No import was in progress.' });
    }

    // ── Recovery management: new words with a working key, or an empty reset after total key loss ──

    /**
     * Starts a recovery-word replacement while a valid key actually decrypts the Wallet (also when the old words are
     * forgotten): every record is decrypted first, then fresh words are shown to the owner's protected surface only.
     */
    public async beginRotation(): Promise<{ readonly words: readonly string[] }> {
        return await this.mutex.run(async () => {
            this.requireReady();
            // Finding an envelope is not enough: every saved login must decrypt with the current key.
            for (const record of this.records) this.credentials(record);
            if (!this.rotation || this.rotation.expiresAt < Date.now()) this.rotation = { words: generateRecoveryWords(), salt: newProjectSalt(), expiresAt: Date.now() + SETUP_DRAFT_MS };
            this.options.onChange();
            return { words: [...this.rotation.words] };
        });
    }

    /** Abandons a word replacement (nothing changed; the old words keep working). */
    public cancelRotation(): WalletOutcome {
        const had = Boolean(this.rotation);
        this.rotation = undefined;
        return this.remember({ action: 'wallet-rotate-cancel', applied: had, outcome: had ? 'Kept the current 12 words for recovery; nothing changed.' : 'No word replacement was in progress.' });
    }

    /** `.ptbk/encryption/generation.json`: the journal of a generation switch in progress. */
    private get generationJournal(): string {
        return join(this.encryptionDirectory, 'generation.json');
    }

    /** The files of one Wallet generation, with the names of the prepared next generation. */
    private generationFiles(): Array<{ readonly current: string; readonly next: string }> {
        return [
            { current: join(this.walletDirectory, 'records.json'), next: join(this.walletDirectory, 'records.next.json') },
            { current: join(this.encryptionDirectory, 'hosts.json'), next: join(this.encryptionDirectory, 'hosts.next.json') },
            { current: join(this.encryptionDirectory, 'project.json'), next: join(this.encryptionDirectory, 'project.next.json') },
        ];
    }

    /**
     * Completes or discards an interrupted generation switch, so the Wallet is always one coherent old or new
     * generation: with its journal the fully prepared next files replace the current ones; without it, prepared files
     * are removed (with their unused host secret).
     */
    private async recoverGeneration(): Promise<void> {
        const journal = await readJsonIfExists<{ readonly replacedReference?: string }>(this.generationJournal).catch(() => undefined);
        const files = this.generationFiles();
        if (journal) {
            for (const file of files) await rename(file.next, file.current).catch(() => undefined);
            if (journal.replacedReference) await this.unlock.remove(journal.replacedReference).catch(() => undefined);
            await rm(this.generationJournal, { force: true });
            this.options.log('Wallet: completed an interrupted replacement of the recovery words.');
            return;
        }
        const prepared = await readJsonIfExists<HostBindings>(files[1]!.next).catch(() => undefined);
        if (!prepared && !(await Promise.all(files.map(async (file) => await stat(file.next).then(() => true, () => false)))).some(Boolean)) return;
        const reference = prepared?.hosts[this.host]?.reference;
        if (reference) await this.unlock.remove(reference).catch(() => undefined);
        for (const file of files) await rm(file.next, { force: true });
    }

    /**
     * Replaces the recovery words: a new root from the fresh words re-encrypts every record, the metadata and this
     * computer's unlock consistently (a journaled switch survives interruption). Records, labels and generators are
     * preserved; the old words no longer open the updated Wallet (older copies of the ciphertext are not revoked).
     */
    public async confirmRotation(): Promise<WalletOutcome> {
        const outcome = await this.mutex.run(async (): Promise<WalletOutcome> => {
            const draft = this.rotation;
            if (!draft || draft.expiresAt < Date.now()) {
                this.rotation = undefined;
                return { action: 'wallet-rotate-confirm', applied: false, outcome: 'No word replacement is waiting for confirmation (it expires after 30 minutes); start it again.' };
            }
            this.requireReady();
            const previous = this.metadata!;
            const previousBinding = (await this.readBindings(previous))?.hosts[this.host];
            const root = deriveProjectRoot(draft.words, draft.salt);
            const reference = `ptbk-${randomBytes(4).toString('hex')}-${randomBytes(6).toString('hex')}`;
            const secret = randomBytes(WRAPPING_KEY_BYTES);
            try {
                const metadata: EncryptionMetadata = { ...previous, projectKeyId: randomBytes(KEY_ID_BYTES).toString('hex'), createdAt: new Date().toISOString(), salt: draft.salt.toString('base64'), verifier: createVerifier(root, draft.salt) };
                const key = domainKey(root, draft.salt, WALLET_DOMAIN);
                const problem = await this.unlock.problem();
                if (problem) throw new PtbkError(problem, { kind: 'setup', effect: 'The recovery words were not replaced; nothing changed.' });
                await this.unlock.store(reference, secret);
                const bindings: HostBindings = { projectKeyId: metadata.projectKeyId, hosts: { [this.host]: { facility: this.unlock.facility, reference, wrappedRoot: seal(secret, HOST_DOMAIN, root), at: new Date().toISOString() } } };
                const [records, hosts, project] = this.generationFiles();
                // Prepare the complete next generation, then switch under a journal (all or nothing, also after a crash).
                await writeJsonAtomic(records!.next, this.sealedRecords(key, metadata.projectKeyId), { mode: PRIVATE_FILE_MODE });
                await writeJsonAtomic(hosts!.next, bindings, { mode: PRIVATE_FILE_MODE });
                await writeJsonAtomic(project!.next, metadata, { mode: PRIVATE_FILE_MODE });
                await writeJsonAtomic(this.generationJournal, { replacedReference: previousBinding?.facility === this.unlock.facility ? previousBinding.reference : undefined, at: new Date().toISOString() }, { mode: PRIVATE_FILE_MODE });
                for (const file of this.generationFiles()) await rename(file.next, file.current);
                await rm(this.generationJournal, { force: true });
                if (previousBinding?.facility === this.unlock.facility) await this.unlock.remove(previousBinding.reference).catch(() => undefined);
                // The in-memory records follow the new key.
                const reopened = this.records.map((record) => ({ ...record, secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify(this.credentials(record)), 'utf8')) }));
                this.metadata = metadata;
                this.key = key;
                this.records = reopened;
                this.rotation = undefined;
                return { action: 'wallet-rotate-confirm', applied: true, outcome: `The Wallet now uses the new 12 words for recovery; all ${this.records.length} saved login${this.records.length === 1 ? '' : 's'} are preserved and this computer still unlocks it automatically. The old words no longer open it. Other computers need the new words once.` };
            } finally {
                root.fill(0);
                secret.fill(0);
            }
        });
        if (outcome.applied) {
            this.options.log('Wallet: replaced the 12 words for recovery (all saved logins re-encrypted).');
            await this.recordAudit({ subject: 'Wallet - Replace the recovery words', body: 'Generated new 12 words for recovery and re-encrypted every saved login under them; this computer keeps its automatic unlock.\nThe words, keys, secret values and the encrypted vault are never committed.' });
        }
        return this.remember(outcome);
    }

    /**
     * Starts an explicit empty reset of a Wallet no valid key can unlock (no working host unlock and no words): it
     * requires the typed confirmation `RESET` after the all-data-loss warning and returns fresh words; the old Wallet is
     * replaced only when the owner confirms those words (cancelling keeps the original ciphertext).
     */
    public async beginReset(input: { readonly confirm: string }): Promise<{ readonly words: readonly string[]; readonly warning: string }> {
        return await this.mutex.run(async () => {
            if (this.state === 'ready') throw new PtbkError('The Wallet can be unlocked here, so nothing is lost: generate new 12 words instead of resetting it.', { kind: 'conflict', effect: 'Nothing was changed.' });
            if (this.state === 'empty' && !this.metadata) throw new PtbkError('There is no Wallet to reset; set it up instead.', { kind: 'usage', effect: 'Nothing was changed.' });
            if (input.confirm !== 'RESET') throw new PtbkError(`Type RESET to confirm. ${RESET_WARNING}`, { kind: 'usage', effect: 'Nothing was changed.' });
            const problem = await this.unlock.problem();
            if (problem) throw new PtbkError(problem, { kind: 'setup', effect: 'Nothing was changed.' });
            if (!this.draft?.reset || this.draft.expiresAt < Date.now()) this.draft = { words: generateRecoveryWords(), salt: newProjectSalt(), expiresAt: Date.now() + SETUP_DRAFT_MS, reset: true };
            this.options.onChange();
            return { words: [...this.draft.words], warning: RESET_WARNING };
        });
    }

    /** Removes an unrecoverable Wallet's data (confirmed reset only); project Books, configuration and history stay. */
    private async discardUnrecoverable(): Promise<void> {
        const metadata = this.metadata ?? (await this.readMetadata().catch(() => undefined));
        const binding = metadata ? (await this.readBindings(metadata))?.hosts[this.host] : undefined;
        if (binding?.facility === this.unlock.facility) await this.unlock.remove(binding.reference).catch(() => undefined);
        for (const file of this.generationFiles()) {
            await rm(file.current, { force: true });
            await rm(file.next, { force: true });
        }
        await rm(this.generationJournal, { force: true });
        this.metadata = undefined;
        this.key = undefined;
        this.records = [];
        this.lockedRecords = 0;
        this.state = 'empty';
        this.problem = undefined;
        // Requests that waited for the lost Wallet now wait for a login to be added to the new one.
        this.actions = this.actions.map((action) => (action.state === 'pending' && action.problem === 'locked' ? { ...action, problem: 'missing', reason: `A login for ${action.origin} is needed; the Wallet was reset and has none.` } : action));
        await this.writeActions();
    }

    /** Requires a ready Wallet for record management. */
    private requireReady(): Buffer {
        if (this.state === 'ready' && this.key) return this.key;
        if (this.readiness === 'empty' || this.readiness === 'setup') throw new PtbkError('Set up the Wallet first (it shows 12 words for recovery once).', { kind: 'setup', effect: 'Nothing was saved.' });
        throw new PtbkError(this.problem ?? 'The Wallet is locked on this computer.', { kind: 'setup', effect: 'Nothing was saved.', next: ['Enter the 12 words for recovery on the Wallet page.'] });
    }

    /** Decrypts a record; the encrypted origin must equal its label (a swapped ciphertext is refused). */
    private credentials(record: StoredRecord): Credentials {
        if (!this.key) this.requireReady();
        const value = JSON.parse(open(this.key!, WALLET_DOMAIN, record.secret).toString('utf8')) as Credentials;
        if (value.origin !== record.origin) throw new PtbkError(`The saved login for ${record.origin} does not belong to that website; it is not used.`, { kind: 'conflict' });
        return value;
    }

    /**
     * Saves (adds or updates) a login from protected owner input. The password is write-only: it is encrypted at once
     * and never returned. Pending requests for that website are resolved, so waiting work resumes.
     */
    public async save(input: { readonly origin: string; readonly username: string; readonly password: string; readonly label?: string; readonly id?: string; readonly action?: string }): Promise<WalletOutcome> {
        const result = await this.mutex.run(async (): Promise<{ outcome: WalletOutcome; settled: number; audit: Omit<PendingAudit, 'at'> }> => {
            const key = this.requireReady();
            const action = input.action ? this.actions.find((candidate) => candidate.id === input.action) : undefined;
            const origin = normalizeOrigin(input.origin || action?.origin || '');
            const username = input.username.trim();
            if (!username) throw new PtbkError('Enter the username (or email) of the login.', { kind: 'usage', effect: 'Nothing was saved.' });
            if (!input.password) throw new PtbkError('Enter the password of the login.', { kind: 'usage', effect: 'Nothing was saved.' });
            const existing = (input.id ? this.records.find((record) => record.id === input.id) : undefined) ?? this.records.find((record) => originMatches(record.origin, origin) && this.usernameOf(record)?.toLowerCase() === username.toLowerCase());
            const now = new Date().toISOString();
            const record: StoredRecord = {
                id: existing?.id ?? randomBytes(6).toString('hex'),
                origin,
                account: input.label?.trim() || (existing && !input.label ? existing.account : walletLabel(origin, username)),
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
                secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify({ origin, username, password: input.password } satisfies Credentials), 'utf8')),
            };
            this.records = existing ? this.records.map((candidate) => (candidate.id === existing.id ? record : candidate)) : [...this.records, record];
            await this.writeRecords();
            let settled = 0;
            for (const pending of this.actions.filter((candidate) => candidate.state === 'pending' && (candidate.id === input.action || originMatches(candidate.origin, origin)))) {
                this.settle(pending.id, 'resolved', record.id);
                settled++;
            }
            if (settled) await this.writeActions();
            return {
                outcome: { action: 'wallet-save', applied: true, outcome: `${existing ? 'Updated' : 'Saved'} the login "${record.account}" for ${origin}.${settled ? ` ${settled === 1 ? 'The waiting request was' : `${settled} waiting requests were`} resolved; the work resumes.` : ''}` },
                settled,
                audit: auditOf(existing ? 'Update' : 'Add', record, settled ? `Resolved ${settled === 1 ? 'one waiting login request' : `${settled} waiting login requests`}.` : undefined),
            };
        });
        this.options.log(`Wallet: ${result.outcome.outcome}`);
        if (result.settled) this.options.onSettled?.();
        await this.recordAudit(result.audit);
        return this.remember(result.outcome);
    }

    /** The username of a record (undefined when it cannot be decrypted). */
    private usernameOf(record: StoredRecord): string | undefined {
        try {
            return this.credentials(record).username;
        } catch {
            return undefined;
        }
    }

    /** Removes a saved login (other records are preserved). */
    public async remove(id: string): Promise<WalletOutcome> {
        let removed: StoredRecord | undefined;
        const outcome = await this.mutex.run(async (): Promise<WalletOutcome> => {
            this.requireReady();
            const record = this.records.find((candidate) => candidate.id === id);
            if (!record) return { action: 'wallet-remove', applied: false, outcome: 'No saved login has that id.' };
            this.records = this.records.filter((candidate) => candidate.id !== id);
            await this.writeRecords();
            removed = record;
            return { action: 'wallet-remove', applied: true, outcome: `Removed the login "${record.account}" for ${record.origin}.` };
        });
        if (outcome.applied) this.options.log(`Wallet: ${outcome.outcome}`);
        if (removed) await this.recordAudit(auditOf('Remove', removed));
        return this.remember(outcome);
    }

    /** `.ptbk/state/wallet-audit.json`: audits of successful mutations whose commit is still pending. */
    private get auditFile(): string {
        return join(this.options.project.runtime.state, 'wallet-audit.json');
    }

    /** Serializes audit persistence (independent of record mutations, which never wait for Git). */
    private readonly auditMutex = new Mutex();

    /**
     * Records a successful mutation's nonsecret audit (when enabled) and commits every pending audit in order. A Git
     * failure keeps the audit pending for a later retry; the mutation itself is never repeated or undone.
     */
    private async recordAudit(audit?: Omit<PendingAudit, 'at'>): Promise<void> {
        // Disabled (or an explicitly uncommitted workflow): no audit; earlier pending ones wait until it is enabled.
        if (!this.options.audit?.isEnabled()) return;
        const commit = this.options.audit.commit;
        await this.auditMutex.run(async () => {
            const pending = ((await readJsonIfExists<PendingAudit[]>(this.auditFile).catch(() => undefined)) ?? []).slice();
            if (audit) pending.push({ ...audit, at: new Date().toISOString() });
            if (!pending.length) return;
            const remaining: PendingAudit[] = [];
            for (const entry of pending) {
                // Order is kept: after one failure the later audits wait behind it.
                if (remaining.length) {
                    remaining.push(entry);
                    continue;
                }
                try {
                    await commit(entry.subject, entry.body);
                } catch (error) {
                    const failure = errorMessage(error);
                    if (entry.failure !== failure) this.options.log(`Wallet: the audit commit "${entry.subject}" is pending (${failure}); the change itself is saved and is not repeated.`, 'warning');
                    remaining.push({ ...entry, failure });
                }
            }
            await ensureDirectory(this.options.project.runtime.state);
            await writeJsonAtomic(this.auditFile, remaining);
        });
    }

    /** Retries audit commits an earlier attempt or process could not create (e.g. after a hook failure). */
    public async retryAudits(): Promise<void> {
        await this.recordAudit();
    }

    /** Dismisses a pending login request: the waiting work resumes without it. */
    public async dismiss(id: string): Promise<WalletOutcome> {
        const outcome = await this.mutex.run(async (): Promise<WalletOutcome> => {
            const action = this.actions.find((candidate) => candidate.id === id && candidate.state === 'pending');
            if (!action) return { action: 'wallet-dismiss', applied: false, outcome: 'No pending login request has that id.' };
            this.settle(id, 'dismissed');
            await this.writeActions();
            return { action: 'wallet-dismiss', applied: true, outcome: `Dismissed the login request for ${action.origin}; the waiting work continues without it.` };
        });
        if (outcome.applied) this.options.onSettled?.();
        return this.remember(outcome);
    }

    /** Marks an action settled (in memory; the caller persists). */
    private settle(id: string, state: 'resolved' | 'dismissed', record?: string): void {
        this.actions = this.actions.map((action) => (action.id === id ? { ...action, state, settledAt: new Date().toISOString(), ...(record ? { record } : {}) } : action));
    }

    /** The state of a login action waiting work refers to (undefined: unknown, never blocks). */
    public action(id: string): { readonly state: 'pending' | 'resolved' | 'dismissed'; readonly origin: string } | undefined {
        const action = this.actions.find((candidate) => candidate.id === id);
        return action ? { state: action.state, origin: action.origin } : undefined;
    }

    /**
     * Creates (or joins) the one pending login request of a website/account: repeated and concurrent requests of the
     * same login share it, and every waiting task is listed.
     */
    private async request(input: { readonly origin: string; readonly account?: string; readonly problem: WalletActionView['problem']; readonly reason: string; readonly task?: string; readonly browser: string }): Promise<StoredAction> {
        const existing = this.actions.find((action) => action.state === 'pending' && originMatches(action.origin, input.origin) && (action.account ?? '').toLowerCase() === (input.account ?? '').toLowerCase());
        let action: StoredAction;
        if (existing) {
            action = { ...existing, problem: input.problem, reason: input.reason, requests: existing.requests + 1, tasks: input.task && !existing.tasks.includes(input.task) ? [...existing.tasks, input.task] : existing.tasks };
            this.actions = this.actions.map((candidate) => (candidate.id === existing.id ? action : candidate));
        } else {
            action = { id: randomBytes(5).toString('hex'), origin: input.origin, ...(input.account ? { account: input.account } : {}), problem: input.problem, reason: input.reason, tasks: input.task ? [input.task] : [], browser: input.browser, createdAt: new Date().toISOString(), requests: 1, state: 'pending' };
            this.actions = [...this.actions, action];
            this.options.log(`Wallet: ${input.reason} Add it on the Wallet page.`, 'warning');
        }
        await this.writeActions();
        this.options.onChange();
        return action;
    }

    /**
     * Signs the page in with a saved login of its actual origin, automatically and without per-use approval. Without a
     * suitable login (missing, rejected, or a locked Wallet) one pending request for protected owner input is created.
     * The agent only ever receives the redacted outcome.
     */
    public async login(page: SignInPage, request: { readonly account?: string; readonly reason?: string; readonly task?: string }): Promise<WalletLoginResult> {
        const inspected = await page.inspect();
        let origin: string;
        try {
            origin = normalizeOrigin(inspected.origin);
        } catch {
            return { status: 'failed', reason: 'The current tab shows no website; open the login page of the site first.' };
        }
        if (inspected.form === 'none') return { status: 'no-login-form', origin };
        const account = request.account?.trim() || undefined;
        const purpose = request.reason?.trim() ? ` (${request.reason.trim().slice(0, 200)})` : '';
        return await this.mutex.run(async (): Promise<WalletLoginResult> => {
            const waitFor = async (problem: WalletActionView['problem'], reason: string): Promise<WalletLoginResult> => {
                const action = await this.request({ origin, account, problem, reason, task: request.task, browser: page.browser });
                return { status: 'waiting', origin, action: action.id, problem, reason };
            };
            // A host facility that was not available at startup (for example a credential store still locked) is
            // tried again before anyone is asked.
            if (this.state !== 'ready' && this.metadata) await this.unlockWithHost(this.metadata);
            if (this.state !== 'ready' || !this.key) {
                if (this.state === 'locked' || this.state === 'unavailable') return await waitFor('locked', `A login for ${origin}${account ? ` (${account})` : ''} is needed${purpose}, but the Wallet is locked on this computer.`);
                return await waitFor('missing', `A login for ${origin}${account ? ` (${account})` : ''} is needed${purpose}; the Wallet has none.`);
            }
            const candidates = this.records.filter((record) => originMatches(record.origin, origin));
            const matching = account ? candidates.filter((record) => record.account.toLowerCase() === account.toLowerCase() || this.usernameOf(record)?.toLowerCase() === account.toLowerCase()) : candidates;
            if (!matching.length) return await waitFor('missing', `A login for ${origin}${account ? ` (${account})` : ''} is needed${purpose}; the Wallet has none.`);
            if (matching.length > 1) return { status: 'ambiguous', origin, accounts: matching.map((record) => record.account) };
            const record = matching[0]!;
            const pendingRejection = this.actions.find((action) => action.state === 'pending' && action.problem === 'rejected' && originMatches(action.origin, origin));
            // A rejected login is not retried silently (no lockouts, no repeated prompts): it waits for the owner's update.
            if (record.lastOutcome === 'rejected' && pendingRejection) return await waitFor('rejected', pendingRejection.reason);
            let credentials: Credentials;
            try {
                credentials = this.credentials(record);
            } catch (error) {
                return { status: 'failed', reason: errorMessage(error) };
            }
            const attempt = await page.signIn(credentials).catch((error: unknown): SignInAttempt => ({ result: 'no-form', note: errorMessage(error) }));
            const now = new Date().toISOString();
            const update = (changes: Partial<StoredRecord>): void => {
                this.records = this.records.map((candidate) => (candidate.id === record.id ? { ...candidate, ...changes } : candidate));
            };
            switch (attempt.result) {
                case 'signed-in':
                case 'challenge':
                    update({ lastUsedAt: now, lastOutcome: 'signed-in' });
                    await this.writeRecords();
                    return attempt.result === 'signed-in' ? { status: 'signed-in', origin, account: record.account, note: attempt.note } : { status: 'challenge', origin, account: record.account, note: attempt.note };
                case 'rejected':
                    update({ lastUsedAt: now, lastOutcome: 'rejected' });
                    await this.writeRecords();
                    return await waitFor('rejected', `${origin} rejected the saved login "${record.account}"${purpose}; update it in the Wallet.`);
                case 'no-form':
                    return { status: 'failed', reason: `The login form of ${origin} could not be filled${attempt.note ? `: ${attempt.note}` : ''}.` };
            }
        });
    }

    /** The nonsecret view for snapshots, pages and the API. */
    public view(): WalletView {
        const pending = this.actions.filter((action) => action.state === 'pending').map(({ state: _state, settledAt: _settled, record: _record, ...view }) => view);
        const state = this.readiness;
        const count = (amount: number, noun: string): string => `${amount} ${noun}${amount === 1 ? '' : 's'}`;
        const summary =
            state === 'ready'
                ? `${count(this.records.length, 'saved login')}${pending.length ? ` · ${count(pending.length, 'login request')} waiting` : ''}`
                : state === 'setup'
                  ? 'Setup: write down the 12 words for recovery, then confirm'
                  : state === 'empty'
                    ? pending.length
                        ? `${count(pending.length, 'login request')} waiting · not set up yet`
                        : 'Not set up (no saved logins)'
                    : state === 'locked'
                      ? `Locked on this computer${this.lockedRecords ? ` · ${count(this.lockedRecords, 'saved login')} (encrypted)` : ''}${pending.length ? ` · ${count(pending.length, 'login request')} waiting` : ''}`
                      : 'Unavailable on this computer';
        return {
            state,
            summary,
            ...(this.problem ? { problem: this.problem } : {}),
            ...(this.metadata ? { facility: this.unlock.facility } : {}),
            records: this.records.map(({ id, origin, account, updatedAt, lastUsedAt, lastOutcome }) => ({ id, origin, account, updatedAt, ...(lastUsedAt ? { lastUsedAt } : {}), ...(lastOutcome ? { lastOutcome } : {}) })),
            ...(this.lockedRecords ? { lockedRecords: this.lockedRecords } : {}),
            management: { canImport: state === 'ready', canRotate: state === 'ready', canReset: (state === 'locked' || state === 'unavailable') && Boolean(this.metadata || this.problem) },
            pending,
            ...(this.lastAction ? { lastAction: this.lastAction } : {}),
        };
    }
}

/**
 * The nonsecret audit of a mutation: the operation and the item's editable label and service, never a username,
 * password, generator secret, code or key.
 */
function auditOf(operation: 'Add' | 'Update' | 'Remove', record: Pick<StoredRecord, 'origin' | 'account'>, detail?: string): Omit<PendingAudit, 'at'> {
    const verb = operation === 'Add' ? 'Add' : operation === 'Update' ? 'Update' : 'Remove';
    return {
        subject: `Wallet - ${verb} login "${record.account}"`,
        body: [`${verb === 'Add' ? 'Added' : verb === 'Update' ? 'Updated' : 'Removed'} the saved login "${record.account}" for ${record.origin} in the encrypted project Wallet.`, detail, 'Secret values and the encrypted vault are never committed.'].filter(Boolean).join('\n'),
    };
}
