import { createHash, randomBytes } from 'node:crypto';
import { open as openFile, readFile, rename, rm, stat } from 'node:fs/promises';
import { hostname, userInfo } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { redact } from '../common/redact.js';
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
 * One additional reusable login field of a saved login, such as a date of birth, a security answer or a customer number:
 * encrypted with its record like the password and never shown to agents or in views. `uncertain` keeps a value whose
 * validity for later logins is not known (so it need not be asked again), without making it ordinary metadata.
 * One-time codes are never login fields.
 *
 * @private Wallet
 */
export type LoginField = { readonly label: string; readonly value: string; readonly uncertain?: boolean };

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
    /** The latest explicit credential test (absent: never tested, i.e. unverified). */
    readonly verification?: WalletVerification;
    /** The step of a credential test running now, for live progress. */
    readonly testing?: string;
    /**
     * The running test waits for the owner: at the website's one-time code step for their protected input (`code`), or
     * for their approval of the sign-in in the service's app or on another device (`approval`, nothing to enter).
     */
    readonly testAwaits?: 'code' | 'approval';
    /** Labels of its additional login fields (their values stay encrypted and are never shown). */
    readonly fields?: readonly { readonly label: string; readonly uncertain?: boolean }[];
};

/**
 * The latest credential test of one saved login, redacted (historical evidence, not a guarantee that a session stays
 * valid): `verified` when the website accepted exactly this credential in a fresh login context, `rejected` when it
 * refused it, `incomplete` when the test could not finish (a missing factor, no login form found, a cancelled test or
 * an unavailable website or browser; the saved login stays as it is, unverified).
 *
 * @private Wallet
 */
export type WalletVerification = { readonly state: 'verified' | 'rejected' | 'incomplete'; readonly at: string; readonly reason: string };

/**
 * A separate, fresh login context (no existing sessions) opened at a website for a credential test; disposing it
 * leaves existing sessions untouched.
 *
 * @private Wallet
 */
export type LoginContext = { readonly page: SignInPage; readonly dispose: () => Promise<void> };

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
    /**
     * `missing`: no saved login; `rejected`: the saved login was refused by the site; `locked`: the Wallet needs
     * restoration first; `code`: the site asks for a one-time code only the owner can provide (used once, never stored);
     * `field`: the site's login form asks for additional fields the saved login does not have yet.
     */
    readonly problem: 'missing' | 'rejected' | 'locked' | 'code' | 'field';
    /** For a `field` request: the labels the site asks for and the saved login they complete. */
    readonly fields?: readonly string[];
    readonly login?: string;
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
    /**
     * Owner maintenance that applies now: import, new recovery words (a working key), or an empty reset (no key), with
     * the engine's all-data-loss warning every client shows before the reset is confirmed.
     */
    readonly management?: { readonly canImport: boolean; readonly canRotate: boolean; readonly canReset: boolean; readonly resetWarning?: string };
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
    /**
     * Origin of the page now open, and whether it shows a login form (`code`: only a one-time code field; `approval`: no
     * field, the page waits for the sign-in to be approved in the service's app or on another device).
     */
    readonly inspect: () => Promise<{ readonly origin: string; readonly form: 'password' | 'username' | 'code' | 'approval' | 'none' }>;
    /**
     * Enters the credentials of their origin (only while the page is on it; not recorded, never returned), submits and
     * verifies the resulting session.
     */
    readonly signIn: (credentials: SignInCredentials) => Promise<SignInAttempt>;
    /**
     * Enters a one-time code into the page's code field (only while the page is on `origin`; not recorded), submits
     * and verifies the result: `rejected` when the site asks for a code again. Absent: codes cannot be entered here.
     */
    readonly enterCode?: (origin: string, code: string) => Promise<SignInAttempt>;
};

/**
 * What the trusted sign-in enters on a page of `origin`: the username, the password and the additional login fields the
 * form asks for.
 *
 * @private Wallet
 */
export type SignInCredentials = { readonly origin: string; readonly username: string; readonly password: string; readonly fields?: readonly LoginField[] };

/**
 * Verified result of entering credentials on a page. A `challenge` with `missingFields` names required fields of the
 * login form that no saved field matches (nothing was submitted, so it is no rejection).
 *
 * @private Wallet
 */
export type SignInAttempt = { readonly result: 'signed-in' | 'rejected' | 'challenge' | 'no-form'; readonly note?: string; readonly missingFields?: readonly string[] };

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
    /** No login of this origin, but of a related service domain: sign in on that login's own page instead. */
    | { readonly status: 'related'; readonly origin: string; readonly logins: readonly { readonly origin: string; readonly account: string }[] }
    /** The site asks for a one-time code and the owner supplied none: the agent gets it from a channel it can read, or requests it. */
    | { readonly status: 'code-needed'; readonly origin: string }
    /** The Wallet entered the owner's one-time code and the site accepted it. */
    | { readonly status: 'code-entered'; readonly origin: string; readonly note?: string }
    /** The page waits for the sign-in to be approved in the service's app or on another device: nothing to enter. */
    | { readonly status: 'approval-needed'; readonly origin: string }
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
     * mutation; `commit` creates one scoped audit commit, empty when no file changes. A failed commit is retried after
     * `retryMs` (default one minute) until it succeeds.
     */
    readonly audit?: { readonly isEnabled: () => boolean; readonly commit: (subject: string, body: string) => Promise<void>; readonly retryMs?: number };
    /** Opens a separate, fresh login context at a website for a credential test (absent: tests cannot run here). */
    readonly loginContext?: (origin: string) => Promise<LoginContext>;
    /**
     * How long a setup or import draft stays valid without confirmation (default 30 minutes). Initialization holds its
     * draft for the whole wizard, until the final project-creation confirmation or until the process ends.
     */
    readonly draftLifetimeMs?: number;
    /** How long a credential test waits for the owner's one-time code or approval at such a step (default ten minutes). */
    readonly testCodeWaitMs?: number;
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
    readonly verification?: WalletVerification;
    readonly secret: Envelope;
};

/**
 * One persisted login request.
 */
type StoredAction = WalletActionView & { readonly state: 'pending' | 'resolved' | 'dismissed'; readonly settledAt?: string; readonly record?: string };

/**
 * Decrypted content of a record (only inside the Wallet and the trusted sign-in).
 */
type Credentials = {
    readonly origin: string;
    readonly username: string;
    readonly password: string;
    /** Additional reusable login fields. */
    readonly fields?: readonly LoginField[];
    /** Retained legacy TOTP generator data (preserved, never generated or newly imported: that is future scope). */
    readonly totp?: string;
};

/**
 * The complete content of one record as it is encrypted on disk: service, account, label, times and secrets alike.
 */
type RecordContent = Credentials & { readonly label: string; readonly createdAt: string; readonly updatedAt: string; readonly lastUsedAt?: string; readonly lastOutcome?: 'signed-in' | 'rejected'; readonly verification?: WalletVerification };

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
    /** Source fields that are not imported (e.g. a TOTP generator: Wallet-owned TOTP generation is future scope). */
    readonly unsupported: readonly string[];
    /** Labels of the additional login fields imported with it (never their values). */
    readonly fields?: readonly string[];
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
 * How long a credential test waits at a one-time code step for the owner's code, or for their approval of the sign-in.
 */
const TEST_CODE_WAIT_MS = 10 * 60_000;

/**
 * How often a credential test waiting for an approval looks whether the website has moved on.
 */
const TEST_APPROVAL_POLL_MS = 2_000;

/**
 * Codes a credential test enters before it ends as incomplete (a refused code asks for the current one).
 */
const TEST_CODE_ATTEMPTS = 3;

/**
 * What an empty reset loses (shown before its separate destructive confirmation).
 */
const RESET_WARNING = 'Resetting discards ALL old Wallet data for good: the list of services and accounts, labels, usernames, passwords, additional login fields and any retained legacy TOTP data. It cannot be recovered without the old 12 words or a computer that still unlocks it. Saved logins must be added or imported again.';

/**
 * Settled login actions are kept this long (7 days; once-only resume of waiting work across restarts), then pruned.
 */
const SETTLED_RETENTION_MS = 604_800_000;

/**
 * How long a one-time code the owner supplied stays usable (sites' codes expire within minutes anyway).
 */
const CODE_VALIDITY_MS = 10 * 60_000;

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
 * Second-level labels under which a two-letter country domain registers names (`example.co.uk`).
 */
const COUNTRY_SECOND_LEVELS = new Set(['ac', 'co', 'com', 'edu', 'gob', 'gov', 'ltd', 'mil', 'ne', 'net', 'nic', 'or', 'org', 'plc', 'sch']);

/**
 * Hosting domains whose subdomains belong to different owners: each subdomain is its own site.
 */
const SHARED_HOSTING_DOMAINS = [
    'github.io',
    'gitlab.io',
    'herokuapp.com',
    'vercel.app',
    'netlify.app',
    'pages.dev',
    'workers.dev',
    'web.app',
    'firebaseapp.com',
    'appspot.com',
    'azurewebsites.net',
    'cloudfront.net',
    'blogspot.com',
    'onrender.com',
    'fly.dev',
    'glitch.me',
    'wordpress.com',
    'wixsite.com',
    'myshopify.com',
    's3.amazonaws.com',
];

/**
 * The site (registrable domain) of a host: its last two labels, three under a country second level (`co.uk`) or a
 * shared hosting domain. IP addresses and single-label hosts such as `localhost` have none.
 */
function siteOf(hostname: string): string | undefined {
    const name = hostname.toLowerCase().replace(/\.$/, '');
    if (!name.includes('.') || name.includes(':') || /^[\d.]+$/.test(name)) return undefined;
    const labels = name.split('.');
    const shared = SHARED_HOSTING_DOMAINS.find((domain) => name === domain || name.endsWith(`.${domain}`));
    if (shared) return labels.slice(-(shared.split('.').length + 1)).join('.');
    const country = labels.length >= 3 && labels[labels.length - 1]!.length === 2 && COUNTRY_SECOND_LEVELS.has(labels[labels.length - 2]!);
    return labels.slice(country ? -3 : -2).join('.');
}

/**
 * Whether two origins are related service domains of one site over the same scheme (a subdomain, the bare domain or a
 * sibling such as `accounts.google.com` for `mail.google.com`). Only for **discovery** of a stored login: secrets are
 * still entered only on a page of the login's own origin ({@link originMatches}).
 *
 * @private Wallet
 */
export function originsRelated(a: string, b: string): boolean {
    try {
        const first = new URL(a);
        const second = new URL(b);
        const site = siteOf(first.hostname);
        return first.protocol === second.protocol && site !== undefined && site === siteOf(second.hostname);
    } catch {
        return false;
    }
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
    /** Credential tests running now, with their current step (live progress, never persisted). */
    private readonly testing = new Map<string, string>();
    /** Credential tests waiting at a code step: each takes the owner's code once (undefined ends the wait). */
    private readonly testWaits = new Map<string, (code: string | undefined) => void>();
    /** Credential tests waiting for the owner to approve the sign-in where the website asked (nothing to enter). */
    private readonly testApprovals = new Set<string>();
    /** Credential tests the owner cancelled while they run. */
    private readonly testCancelled = new Set<string>();
    /** One-time codes the owner supplied, by origin: used once within their validity, held in memory only. */
    private readonly codes = new Map<string, { readonly code: string; readonly expires: number }>();
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
    /** The project whose `.ptbk/` holds this Wallet (moves only while nothing is written, see `relocate`). */
    private project: Project;

    public constructor(private readonly options: WalletOptions) {
        this.unlock = options.unlock ?? hostUnlock(options.env);
        this.project = options.project;
    }

    /** `.ptbk/encryption/`. */
    private get encryptionDirectory(): string {
        return join(this.project.runtime.root, 'encryption');
    }

    /** `.ptbk/wallet/`. */
    private get walletDirectory(): string {
        return join(this.project.runtime.root, 'wallet');
    }

    /** When a draft started now expires. */
    private draftExpiry(): number {
        return Date.now() + (this.options.draftLifetimeMs ?? SETUP_DRAFT_MS);
    }

    /**
     * Binds a Wallet that has not been set up yet (its setup and import drafts only in memory) to its final project
     * folder. Initialization stages the Wallet before the new folder's name is final and creates it only after the
     * project-creation confirmation.
     */
    public relocate(project: Project): void {
        if (this.metadata || this.state !== 'empty') throw new PtbkError('Only a Wallet that is not set up yet can move to another project folder.', { kind: 'conflict', effect: 'Nothing was changed.' });
        this.project = project;
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
                    const credentials: Credentials = { origin: content.origin, username: content.username, password: content.password, ...(content.fields?.length ? { fields: content.fields } : {}), ...(content.totp ? { totp: content.totp } : {}) };
                    records.push({
                        id: entry.id,
                        origin: content.origin,
                        account: content.label,
                        createdAt: content.createdAt,
                        updatedAt: content.updatedAt,
                        ...(content.lastUsedAt ? { lastUsedAt: content.lastUsedAt } : {}),
                        ...(content.lastOutcome ? { lastOutcome: content.lastOutcome } : {}),
                        ...(content.verification ? { verification: content.verification } : {}),
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
            const content: RecordContent = { ...this.credentials(record), label: record.account, createdAt: record.createdAt, updatedAt: record.updatedAt, ...(record.lastUsedAt ? { lastUsedAt: record.lastUsedAt } : {}), ...(record.lastOutcome ? { lastOutcome: record.lastOutcome } : {}), ...(record.verification ? { verification: record.verification } : {}) };
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
            if (!this.draft || this.draft.expiresAt < Date.now()) this.draft = { words: generateRecoveryWords(), salt: newProjectSalt(), expiresAt: this.draftExpiry() };
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
     * stays in memory only; nothing is saved before the owner's selection is applied. A setup waiting for confirmation
     * (initialization's draft) can preview too: its new Wallet has no saved logins, and the selection is applied once
     * the setup is confirmed.
     */
    public async previewImport(input: { readonly source?: string; readonly content: string }): Promise<WalletImportPreview> {
        return await this.mutex.run(async () => {
            if (this.readiness !== 'setup') this.requireReady();
            const source = IMPORT_SOURCES[input.source ?? 'bitwarden'];
            if (!source) throw new PtbkError(`Importing from ${input.source} is not supported.`, { kind: 'unsupported', next: ['Use a Bitwarden JSON export.'] });
            const extraction = source.extract(input.content, normalizeOrigin);
            this.importDraft = { id: randomBytes(6).toString('hex'), source: extraction.source, logins: extraction.logins, skipped: extraction.skipped, expiresAt: this.draftExpiry() };
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
            return { key: login.key, label: login.label || walletLabel(login.origin, login.username), origin: login.origin, account: maskAccount(login.username), state, unsupported: login.unsupported ?? [], ...(login.fields?.length ? { fields: login.fields.map((field) => field.label) } : {}) };
        });
        return { draft: draft.id, source: draft.source, candidates, skipped: draft.skipped };
    }

    /** How an imported login relates to the saved ones: the same service and account decide identity, never the label. */
    private importState(login: ImportedLogin): WalletImportCandidate['state'] {
        const existing = this.matchingRecord(login.origin, login.username);
        if (!existing) return 'new';
        const saved = this.credentials(existing);
        return saved.password === login.password ? 'duplicate' : 'conflict';
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
                const existing = this.matchingRecord(login.origin, login.username);
                // Retained legacy factor data of a replaced login is preserved, never discarded by an import, and its
                // additional fields stay unless the export brings a field of the same name.
                const legacy = existing ? this.credentials(existing).totp : undefined;
                const kept = existing ? this.fieldsOf(existing) : [];
                let fields: readonly LoginField[];
                try {
                    fields = mergeLoginFields(kept, login.fields ?? []);
                } catch {
                    // Together they exceed what one login keeps: the saved fields are preserved.
                    fields = kept;
                }
                const credentials: Credentials = { origin: login.origin, username: login.username, password: login.password, ...(fields.length ? { fields } : {}), ...(legacy ? { totp: legacy } : {}) };
                const state = this.importState(login);
                if (state === 'duplicate') reused++;
                else if (state === 'conflict' && existing) {
                    if (!replace.has(login.key)) {
                        skipped++;
                        continue;
                    }
                    const updated: StoredRecord = { ...existing, updatedAt: now, lastOutcome: undefined, verification: undefined, secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify(credentials), 'utf8')) };
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
            const unsupported = draft.logins.filter((login) => selected.has(login.key) && login.unsupported?.length).length;
            const notImported = unsupported ? ` TOTP generators were not imported for ${count(unsupported, 'login')} (not supported yet; a code is entered when a login needs it).` : '';
            const outcome = parts.length ? `${draft.source}: ${parts.join(', ')}.${notImported}${settled ? ` ${settled === 1 ? 'A waiting request was' : `${settled} waiting requests were`} resolved.` : ''} Delete the export file safely now; Promptbook kept no copy. Imported logins are used automatically, but a login is only verified when a website accepts it.` : `${draft.source}: nothing was imported.${notImported}`;
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
            if (!this.rotation || this.rotation.expiresAt < Date.now()) this.rotation = { words: generateRecoveryWords(), salt: newProjectSalt(), expiresAt: this.draftExpiry() };
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
            if (!this.draft?.reset || this.draft.expiresAt < Date.now()) this.draft = { words: generateRecoveryWords(), salt: newProjectSalt(), expiresAt: this.draftExpiry(), reset: true };
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
    public async save(input: { readonly origin: string; readonly username: string; readonly password: string; readonly label?: string; readonly id?: string; readonly action?: string; readonly fields?: readonly LoginField[] }): Promise<WalletOutcome & { readonly id?: string }> {
        const result = await this.mutex.run(async (): Promise<{ outcome: WalletOutcome; id: string; settled: number; audit: Omit<PendingAudit, 'at'> }> => {
            const key = this.requireReady();
            const action = input.action ? this.actions.find((candidate) => candidate.id === input.action) : undefined;
            const origin = normalizeOrigin(input.origin || action?.origin || '');
            const username = input.username.trim();
            if (!username) throw new PtbkError('Enter the username (or email) of the login.', { kind: 'usage', effect: 'Nothing was saved.' });
            if (!input.password) throw new PtbkError('Enter the password of the login.', { kind: 'usage', effect: 'Nothing was saved.' });
            const existing = (input.id ? this.records.find((record) => record.id === input.id) : undefined) ?? this.records.find((record) => originMatches(record.origin, origin) && this.usernameOf(record)?.toLowerCase() === username.toLowerCase());
            // Additional fields of an updated login stay unless the owner changed or removed them.
            const fields = mergeLoginFields(existing ? this.fieldsOf(existing) : [], input.fields ?? []);
            const now = new Date().toISOString();
            const record: StoredRecord = {
                id: existing?.id ?? randomBytes(6).toString('hex'),
                origin,
                account: input.label?.trim() || (existing && !input.label ? existing.account : walletLabel(origin, username)),
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
                // New values are unverified until tested; retained legacy factor data is preserved.
                secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify({ origin, username, password: input.password, ...(fields.length ? { fields } : {}), ...(existing && this.legacyFactor(existing) ? { totp: this.legacyFactor(existing) } : {}) } satisfies Credentials), 'utf8')),
            };
            this.records = existing ? this.records.map((candidate) => (candidate.id === existing.id ? record : candidate)) : [...this.records, record];
            await this.writeRecords();
            let settled = 0;
            // A one-time code request stays: a saved password does not answer it.
            for (const pending of this.actions.filter((candidate) => candidate.state === 'pending' && candidate.problem !== 'code' && (candidate.id === input.action || originMatches(candidate.origin, origin)))) {
                this.settle(pending.id, 'resolved', record.id);
                settled++;
            }
            if (settled) await this.writeActions();
            return {
                id: record.id,
                outcome: { action: 'wallet-save', applied: true, outcome: `${existing ? 'Updated' : 'Saved'} the login "${record.account}" for ${origin}.${settled ? ` ${settled === 1 ? 'The waiting request was' : `${settled} waiting requests were`} resolved; the work resumes.` : ''}` },
                settled,
                audit: auditOf(existing ? 'Update' : 'Add', record, [fields.length ? `With ${fields.length} additional login field${fields.length === 1 ? '' : 's'} (values encrypted).` : '', settled ? `Resolved ${settled === 1 ? 'one waiting login request' : `${settled} waiting login requests`}.` : ''].filter(Boolean).join('\n') || undefined),
            };
        });
        this.options.log(`Wallet: ${result.outcome.outcome}`);
        if (result.settled) this.options.onSettled?.();
        await this.recordAudit(result.audit);
        return { ...this.remember(result.outcome), id: result.id };
    }

    /**
     * Starts the credential test of one saved login in the background and returns at once: a real sign-in can take
     * longer than a control request may wait, so its live progress and result appear in the Wallet view instead.
     */
    public startTest(id: string): WalletOutcome {
        const record = this.testable(id);
        void this.test(id).catch((error: unknown) => this.options.log(`Wallet test: ${errorMessage(error)}`));
        return { action: 'wallet-test', applied: false, outcome: `Testing "${record.account}" for ${record.origin} in a separate login context; its result appears with the login.` };
    }

    /** The record a credential test may start for now (a ready Wallet, an existing login, no test of it running). */
    private testable(id: string): StoredRecord {
        this.requireReady();
        const record = this.records.find((candidate) => candidate.id === id);
        if (!record) throw new PtbkError('This saved login no longer exists.', { kind: 'not-found' });
        if (this.testing.has(id)) throw new PtbkError(`"${record.account}" is being tested already.`, { kind: 'conflict' });
        return record;
    }

    /** The additional login fields of a record (none when it cannot be decrypted). */
    private fieldsOf(record: StoredRecord): readonly LoginField[] {
        try {
            return this.credentials(record).fields ?? [];
        } catch {
            return [];
        }
    }

    /** Retained legacy TOTP data of a record (preserved through updates, never generated). */
    private legacyFactor(record: StoredRecord): string | undefined {
        try {
            return this.credentials(record).totp;
        } catch {
            return undefined;
        }
    }

    /**
     * Tests exactly one saved login through a real sign-in in a separate, fresh login context with the same trusted
     * sign-in as ordinary login (an existing session cannot prove that this credential works, and it is not signed out).
     * The latest redacted result is kept with the encrypted record; the test is not a task, trace, audit or commit
     * (it is no credential mutation), and an incomplete test leaves the saved login as it is, unverified.
     */
    public async test(id: string): Promise<WalletOutcome & { readonly verification: WalletVerification }> {
        const record = this.testable(id);
        // Claimed synchronously, so one login is never tested twice at once.
        this.testing.set(id, 'Starting');
        const secrets: string[] = [];
        try {
            const [state, reason] = await this.verify(
                record,
                (text) => {
                    this.testing.set(id, text);
                    this.options.onChange();
                },
                secrets,
            );
            // The secret never reaches the kept report, even through a website's or browser's message.
            const verification: WalletVerification = { state, at: new Date().toISOString(), reason: secrets.reduce((text, secret) => text.split(secret).join('[redacted]'), redact(reason)) };
            // A login changed or removed meanwhile keeps no result about values it no longer holds.
            const kept = await this.mutex.run(async () => {
                if (!this.records.some((candidate) => candidate.id === id && candidate.updatedAt === record.updatedAt)) return false;
                this.records = this.records.map((candidate) => (candidate.id === id ? { ...candidate, verification } : candidate));
                await this.writeRecords();
                return true;
            });
            this.testing.delete(id);
            const outcome = { action: 'wallet-test', applied: state === 'verified', outcome: `${record.account} (${record.origin}): ${verification.reason}${kept ? '' : ' The login was changed or removed during the test, so this result was not kept.'}` };
            this.options.log(`Wallet test: ${outcome.outcome}`);
            return { ...this.remember(outcome), verification };
        } finally {
            this.testCancelled.delete(id);
            if (this.testing.delete(id)) this.options.onChange();
        }
    }

    /**
     * Takes the one-time code a running credential test waits for from protected owner input: entered once into the
     * test's own login context, never written, logged, kept in the result or shown to agents.
     */
    public supplyTestCode(input: { readonly id: string; readonly code: string }): WalletOutcome {
        const waiting = this.testWaits.get(input.id);
        if (!waiting) throw new PtbkError('This login test is not waiting for a one-time code.', { kind: 'not-found', effect: 'Nothing was entered.' });
        const code = input.code.replace(/\s+/g, '');
        if (!code || code.length > 64) throw new PtbkError('Enter the one-time code the website sent.', { kind: 'usage', effect: 'Nothing was entered.' });
        waiting(code);
        const record = this.records.find((candidate) => candidate.id === input.id);
        return this.remember({ action: 'wallet-test-code', applied: true, outcome: `The test of "${record?.account ?? 'this login'}" enters the code once and checks the result.` });
    }

    /** Cancels a running credential test: it ends as incomplete and the saved login stays as it is. */
    public cancelTest(id: string): WalletOutcome {
        if (!this.testing.has(id)) return this.remember({ action: 'wallet-test-cancel', applied: false, outcome: 'No test of this login is running.' });
        this.testCancelled.add(id);
        this.testWaits.get(id)?.(undefined);
        return this.remember({ action: 'wallet-test-cancel', applied: true, outcome: 'The test is cancelled; the login stays unverified.' });
    }

    /** Waits for the owner's code of a test at a code step (undefined: cancelled or not entered in time). */
    private async awaitTestCode(id: string): Promise<string | undefined> {
        if (this.testCancelled.has(id)) return undefined;
        return await new Promise<string | undefined>((resolve) => {
            const finish = (code: string | undefined): void => {
                clearTimeout(timer);
                this.testWaits.delete(id);
                this.options.onChange();
                resolve(code);
            };
            const timer = setTimeout(() => finish(undefined), this.options.testCodeWaitMs ?? TEST_CODE_WAIT_MS);
            timer.unref?.();
            this.testWaits.set(id, finish);
            this.options.onChange();
        });
    }

    /**
     * The further steps of a credential test after the password: the attending owner approves the sign-in where the
     * website asked, or enters the one-time code it sent through the protected Wallet input (a refused code asks for the
     * current one); a code may be followed by an approval and the other way round. Another kind of step stays incomplete.
     */
    private async testFactorStep(record: StoredRecord, page: SignInPage, step: (text: string) => void, secrets: string[], note?: string): Promise<readonly [WalletVerification['state'], string]> {
        const minutes = Math.round((this.options.testCodeWaitMs ?? TEST_CODE_WAIT_MS) / 60_000);
        const within = minutes ? ` within ${minutes} minute${minutes === 1 ? '' : 's'}` : '';
        for (let steps = 0; steps < 3; steps++) {
            const inspected = await page.inspect().catch(() => undefined);
            if (inspected?.form === 'approval') {
                const approved = await this.testApproval(record, page, step);
                if (approved === 'cancelled') return ['incomplete', 'The test was cancelled at its approval step; the login stays unverified.'];
                if (approved === 'approval') return ['incomplete', `The sign-in was not approved${within}; the password was accepted, but the login stays unverified.`];
                if (approved === 'none') return ['verified', 'The website accepted this login after the sign-in was approved.'];
                if (approved !== 'code') return ['incomplete', 'The website returned to its login form at the approval step (the approval was declined or expired); the login stays unverified.'];
                continue;
            }
            if (inspected?.form !== 'code' || !page.enterCode) return ['incomplete', `The website asks for another step (${note ?? 'a code or an approval'}); the password was accepted only if that step follows it, so the login stays unverified.`];
            const coded = await this.testCode(record, page, page.enterCode, step, secrets, within);
            if (coded) return coded;
        }
        return ['incomplete', 'The website kept asking for further steps; the login stays unverified.'];
    }

    /**
     * The one-time code step of a credential test: the outcome, or undefined when the website accepted the code and
     * asks to approve the sign-in next.
     */
    private async testCode(record: StoredRecord, page: SignInPage, enterCode: NonNullable<SignInPage['enterCode']>, step: (text: string) => void, secrets: string[], within: string): Promise<readonly [WalletVerification['state'], string] | undefined> {
        for (let attempt = 1; attempt <= TEST_CODE_ATTEMPTS; attempt++) {
            step(attempt === 1 ? 'Waiting for the one-time code the website sent; enter it with this login' : 'The website did not accept the code; enter the current one');
            const code = await this.awaitTestCode(record.id);
            if (code === undefined) {
                return ['incomplete', this.testCancelled.has(record.id) ? 'The test was cancelled at its one-time code step; the login stays unverified.' : `No one-time code was entered${within}; the login stays unverified.`];
            }
            secrets.push(code);
            step('Entering the one-time code');
            const entered = await enterCode(record.origin, code).catch((error: unknown): SignInAttempt => ({ result: 'no-form', note: errorMessage(error) }));
            if (entered.result === 'signed-in') return ['verified', `The website accepted this login and the one-time code${entered.note ? ` (${entered.note})` : ''}.`];
            if (entered.result === 'challenge' && (await page.inspect().catch(() => undefined))?.form === 'approval') return undefined;
            if (entered.result !== 'rejected') return ['incomplete', `The one-time code could not be entered${entered.note ? ` (${entered.note})` : ''}; the login stays unverified.`];
        }
        return ['incomplete', `The website did not accept ${TEST_CODE_ATTEMPTS} entered one-time codes; the password was accepted, but the login stays unverified.`];
    }

    /**
     * The approval step of a credential test: the attending owner approves the sign-in in the service's app or on another
     * device while the test watches the page (nothing is entered). The page's next state (`approval`: not approved in
     * time), or `cancelled`.
     */
    private async testApproval(record: StoredRecord, page: SignInPage, step: (text: string) => void): Promise<'cancelled' | 'password' | 'username' | 'code' | 'approval' | 'none'> {
        const wait = this.options.testCodeWaitMs ?? TEST_CODE_WAIT_MS;
        const until = Date.now() + wait;
        this.testApprovals.add(record.id);
        step(`Waiting for you to approve this sign-in where ${record.origin} asked (in its app or on another device)`);
        try {
            for (;;) {
                if (this.testCancelled.has(record.id)) return 'cancelled';
                const form = (await page.inspect().catch(() => undefined))?.form ?? 'approval';
                if (form !== 'approval' || Date.now() >= until) return form;
                await sleep(Math.min(TEST_APPROVAL_POLL_MS, Math.max(10, wait / 10)));
            }
        } finally {
            this.testApprovals.delete(record.id);
            this.options.onChange();
        }
    }

    /**
     * The sign-in of one credential test in a fresh login context: its state and an unredacted reason (`secrets`
     * receives the values the caller must strip from it).
     */
    private async verify(record: StoredRecord, step: (text: string) => void, secrets: string[]): Promise<readonly [WalletVerification['state'], string]> {
        step(`Opening ${record.origin} in a separate login context`);
        if (!this.options.loginContext) return ['incomplete', 'No browser is available for a separate login test here; the login stays unverified.'];
        let context: LoginContext;
        try {
            context = await this.options.loginContext(record.origin);
        } catch (error) {
            return ['incomplete', `The test browser could not be opened (${errorMessage(error)}); the login stays unverified.`];
        }
        const cancelled = (): readonly [WalletVerification['state'], string] | undefined => (this.testCancelled.has(record.id) ? ['incomplete', 'The test was cancelled; the login stays unverified.'] : undefined);
        try {
            const early = cancelled();
            if (early) return early;
            step('Looking for the login form');
            const inspected = await context.page.inspect();
            if (inspected.form === 'none') return ['incomplete', `No login form was found on ${inspected.origin || record.origin} (also after following its sign-in link); the login stays unverified.`];
            const credentials = this.credentials(record);
            secrets.push(credentials.password);
            const before = cancelled();
            if (before) return before;
            step('Signing in with this saved login');
            const attempt = await context.page.signIn(credentials).catch((error: unknown): SignInAttempt => ({ result: 'no-form', note: errorMessage(error) }));
            switch (attempt.result) {
                case 'signed-in':
                    return ['verified', `The website accepted this login${attempt.note ? ` (${attempt.note})` : ''}.`];
                case 'rejected':
                    return ['rejected', `The website rejected this login${attempt.note ? ` (${attempt.note})` : ''}; update it.`];
                case 'challenge':
                    if (attempt.missingFields?.length) return ['incomplete', `The login form asks for ${attempt.missingFields.map((label) => `"${label}"`).join(', ')}, which this login does not have; add ${attempt.missingFields.length === 1 ? 'it' : 'them'} when you update the login. The login stays unverified.`];
                    return await this.testFactorStep(record, context.page, step, secrets, attempt.note);
                case 'no-form':
                    return ['incomplete', `The login form could not be completed${attempt.note ? ` (${attempt.note})` : ''}; the login stays unverified.`];
            }
        } catch (error) {
            return ['incomplete', `The test did not finish (${errorMessage(error)}); the login stays unverified.`];
        } finally {
            await context.dispose().catch(() => undefined);
        }
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
        return join(this.project.runtime.state, 'wallet-audit.json');
    }

    /** Serializes audit persistence (independent of record mutations, which never wait for Git). */
    private readonly auditMutex = new Mutex();

    /** The scheduled retry of pending audit commits. */
    private auditRetry?: NodeJS.Timeout;

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
            await ensureDirectory(this.project.runtime.state);
            await writeJsonAtomic(this.auditFile, remaining);
            if (remaining.length) this.scheduleAuditRetry();
        });
    }

    /** Retries pending audit commits later without waiting for another mutation or a restart (persistence only). */
    private scheduleAuditRetry(): void {
        if (this.auditRetry) return;
        this.auditRetry = setTimeout(() => {
            this.auditRetry = undefined;
            void this.retryAudits().catch(() => undefined);
        }, this.options.audit?.retryMs ?? 60_000);
        this.auditRetry.unref?.();
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
    public action(id: string): { readonly state: 'pending' | 'resolved' | 'dismissed'; readonly origin: string; readonly problem: WalletActionView['problem'] } | undefined {
        const action = this.actions.find((candidate) => candidate.id === id);
        return action ? { state: action.state, origin: action.origin, problem: action.problem } : undefined;
    }

    /**
     * Creates (or joins) the one pending login request of a website/account: repeated and concurrent requests of the
     * same login share it, and every waiting task is listed.
     */
    private async request(input: { readonly origin: string; readonly account?: string; readonly problem: WalletActionView['problem']; readonly reason: string; readonly task?: string; readonly browser: string; readonly fields?: readonly string[]; readonly login?: string }): Promise<StoredAction> {
        const existing = this.actions.find((action) => action.state === 'pending' && originMatches(action.origin, input.origin) && (action.account ?? '').toLowerCase() === (input.account ?? '').toLowerCase());
        const asked = input.fields ? { fields: input.fields, ...(input.login ? { login: input.login } : {}) } : {};
        let action: StoredAction;
        if (existing) {
            const { fields: _fields, login: _login, ...earlier } = existing;
            action = { ...earlier, ...asked, problem: input.problem, reason: input.reason, requests: existing.requests + 1, tasks: input.task && !existing.tasks.includes(input.task) ? [...existing.tasks, input.task] : existing.tasks };
            this.actions = this.actions.map((candidate) => (candidate.id === existing.id ? action : candidate));
        } else {
            action = { id: randomBytes(5).toString('hex'), origin: input.origin, ...(input.account ? { account: input.account } : {}), problem: input.problem, ...asked, reason: input.reason, tasks: input.task ? [input.task] : [], browser: input.browser, createdAt: new Date().toISOString(), requests: 1, state: 'pending' };
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
    public async login(
        page: SignInPage,
        request: {
            readonly account?: string;
            readonly reason?: string;
            readonly task?: string;
            /** The related service domains' logins turned out not to apply to this site. */
            readonly ignoreRelated?: boolean;
            /** The site asks for a one-time code the agent cannot obtain itself: the owner enters it in protected input. */
            readonly requestCode?: boolean;
        },
    ): Promise<WalletLoginResult> {
        const inspected = await page.inspect();
        let origin: string;
        try {
            origin = normalizeOrigin(inspected.origin);
        } catch {
            return { status: 'failed', reason: 'The current tab shows no website; open the login page of the site first.' };
        }
        if (inspected.form === 'none') return { status: 'no-login-form', origin };
        if (inspected.form === 'approval') return { status: 'approval-needed', origin };
        const account = request.account?.trim() || undefined;
        const purpose = request.reason?.trim() ? ` (${request.reason.trim().slice(0, 200)})` : '';
        return await this.mutex.run(async (): Promise<WalletLoginResult> => {
            const waitFor = async (problem: WalletActionView['problem'], reason: string, asked?: { readonly fields: readonly string[]; readonly login: string }): Promise<WalletLoginResult> => {
                const action = await this.request({ origin, account, problem, reason, task: request.task, browser: page.browser, ...asked });
                return { status: 'waiting', origin, action: action.id, problem, reason };
            };
            if (inspected.form === 'code') return await this.codeStep(page, origin, request.requestCode === true, purpose, waitFor);
            // A host facility that was not available at startup (for example a credential store still locked) is
            // tried again before anyone is asked.
            if (this.state !== 'ready' && this.metadata) await this.unlockWithHost(this.metadata);
            if (this.state !== 'ready' || !this.key) {
                if (this.state === 'locked' || this.state === 'unavailable') return await waitFor('locked', `A login for ${origin}${account ? ` (${account})` : ''} is needed${purpose}, but the Wallet is locked on this computer.`);
                return await waitFor('missing', `A login for ${origin}${account ? ` (${account})` : ''} is needed${purpose}; the Wallet has none.`);
            }
            const accountMatches = (record: StoredRecord): boolean => !account || record.account.toLowerCase() === account.toLowerCase() || this.usernameOf(record)?.toLowerCase() === account.toLowerCase();
            const matching = this.records.filter((record) => originMatches(record.origin, origin) && accountMatches(record));
            if (!matching.length) {
                // Discovery across related service domains: an already stored login is never requested again; the agent
                // signs in on that login's own page (secrets are only entered on their own origin).
                const related = request.ignoreRelated ? [] : this.records.filter((record) => !originMatches(record.origin, origin) && originsRelated(record.origin, origin) && accountMatches(record));
                if (related.length) return { status: 'related', origin, logins: related.map((record) => ({ origin: record.origin, account: record.account })) };
                return await waitFor('missing', `A login for ${origin}${account ? ` (${account})` : ''} is needed${purpose}; the Wallet has none.`);
            }
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
            // Required fields of the form that no saved field answers: nothing was submitted, so the owner adds them.
            if (attempt.result === 'challenge' && attempt.missingFields?.length) {
                const labels = attempt.missingFields.map((label) => `"${label}"`).join(', ');
                return await waitFor('field', `The login form of ${origin} asks for ${labels}${purpose}, which the saved login "${record.account}" does not have; add ${attempt.missingFields.length === 1 ? 'it' : 'them'} in the Wallet.`, { fields: attempt.missingFields, login: record.id });
            }
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

    /**
     * The one-time code step of a sign-in: the owner's supplied code is entered once (and dropped either way); without
     * one the agent obtains the code from a channel it can already read, or a protected request asks the owner.
     */
    private async codeStep(page: SignInPage, origin: string, requestCode: boolean, purpose: string, waitFor: (problem: WalletActionView['problem'], reason: string) => Promise<WalletLoginResult>): Promise<WalletLoginResult> {
        const key = [...this.codes.keys()].find((candidate) => originMatches(candidate, origin));
        const held = key ? this.codes.get(key) : undefined;
        if (key) this.codes.delete(key);
        if (held && held.expires > Date.now() && page.enterCode) {
            const attempt = await page.enterCode(origin, held.code).catch((error: unknown): SignInAttempt => ({ result: 'no-form', note: errorMessage(error) }));
            if (attempt.result === 'signed-in') return { status: 'code-entered', origin, ...(attempt.note ? { note: attempt.note } : {}) };
            if (attempt.result === 'rejected') return await waitFor('code', `${origin} did not accept the one-time code${purpose}; enter the current one in the Wallet.`);
            return { status: 'failed', reason: `The one-time code could not be entered on ${origin}${attempt.note ? `: ${attempt.note}` : ''}.` };
        }
        if (!requestCode) return { status: 'code-needed', origin };
        return await waitFor('code', `${origin} asks for a one-time code${purpose} that only the owner can provide.`);
    }

    /**
     * Takes the one-time code for a pending code request from protected owner input. It is held in memory only (never
     * written, logged or shown to agents), entered once by the next sign-in on that website within ten minutes, and is
     * no reusable credential (no audit). The waiting work resumes.
     */
    public async supplyCode(input: { readonly request: string; readonly code: string }): Promise<WalletOutcome> {
        const result = await this.mutex.run(async (): Promise<WalletOutcome> => {
            const action = this.actions.find((candidate) => candidate.id === input.request && candidate.state === 'pending' && candidate.problem === 'code');
            if (!action) throw new PtbkError('This code request is no longer waiting.', { kind: 'not-found', effect: 'Nothing was entered.' });
            const code = input.code.replace(/\s+/g, '');
            if (!code || code.length > 64) throw new PtbkError('Enter the one-time code the website sent.', { kind: 'usage', effect: 'Nothing was entered.' });
            this.codes.set(action.origin, { code, expires: Date.now() + CODE_VALIDITY_MS });
            this.settle(action.id, 'resolved');
            await this.writeActions();
            return { action: 'wallet-code', applied: true, outcome: `The one-time code for ${action.origin} is ready; the waiting work enters it once and resumes.` };
        });
        this.options.log(`Wallet: ${result.outcome}`);
        this.options.onSettled?.();
        return this.remember(result);
    }

    /**
     * Completes a saved login with the additional fields its website's login form asked for, from protected owner input
     * (encrypted with the record, kept for later logins; `uncertain` marks a value that may not stay valid). The waiting
     * work resumes and signs in again.
     */
    public async supplyFields(input: { readonly request: string; readonly fields: readonly LoginField[] }): Promise<WalletOutcome> {
        const result = await this.mutex.run(async () => {
            const key = this.requireReady();
            const action = this.actions.find((candidate) => candidate.id === input.request && candidate.state === 'pending' && candidate.problem === 'field');
            if (!action) throw new PtbkError('This field request is no longer waiting.', { kind: 'not-found', effect: 'Nothing was saved.' });
            const record = this.records.find((candidate) => candidate.id === action.login);
            if (!record) throw new PtbkError('The saved login of this request no longer exists; add the login again.', { kind: 'not-found', effect: 'Nothing was saved.' });
            const supplied = input.fields.filter((field) => field.value);
            if (!supplied.length) throw new PtbkError(`Enter ${(action.fields ?? []).map((label) => `"${label}"`).join(', ') || 'the requested field'}.`, { kind: 'usage', effect: 'Nothing was saved.' });
            const credentials = this.credentials(record);
            const fields = mergeLoginFields(credentials.fields ?? [], supplied);
            const updated: StoredRecord = { ...record, updatedAt: new Date().toISOString(), verification: undefined, secret: seal(key, WALLET_DOMAIN, Buffer.from(JSON.stringify({ ...credentials, fields } satisfies Credentials), 'utf8')) };
            this.records = this.records.map((candidate) => (candidate.id === record.id ? updated : candidate));
            await this.writeRecords();
            this.settle(action.id, 'resolved', record.id);
            await this.writeActions();
            const count = `${supplied.length} additional login field${supplied.length === 1 ? '' : 's'}`;
            return { outcome: { action: 'wallet-field', applied: true, outcome: `Added ${count} to "${record.account}" for ${record.origin}; the waiting work signs in again.` }, audit: auditOf('Update', updated, `Added ${count} (values encrypted) that the website's login form asked for.`) };
        });
        this.options.log(`Wallet: ${result.outcome.outcome}`);
        this.options.onSettled?.();
        await this.recordAudit(result.audit);
        return this.remember(result.outcome);
    }

    /**
     * Intentionally nonsecret metadata of the saved logins for agents (service, label and username or email) through
     * this trusted operation, so work can choose the right account without asking; passwords and factors never leave
     * the Wallet and the stored records stay fully encrypted. With a site, only logins of that website or a related
     * service domain.
     */
    public accounts(site?: string): { readonly state: WalletState; readonly accounts: readonly { readonly origin: string; readonly label: string; readonly username?: string; readonly related?: boolean }[] } {
        const origin = site === undefined ? undefined : normalizeOrigin(site);
        if (this.state !== 'ready' || !this.key) return { state: this.readiness, accounts: [] };
        const accounts = this.records
            .filter((record) => !origin || originMatches(record.origin, origin) || originsRelated(record.origin, origin))
            .map((record) => {
                const username = this.usernameOf(record);
                return { origin: record.origin, label: record.account, ...(username ? { username } : {}), ...(origin && !originMatches(record.origin, origin) ? { related: true } : {}) };
            });
        return { state: 'ready', accounts };
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
            records: this.records.map((record): WalletRecordView => {
                const { id, origin, account, updatedAt, lastUsedAt, lastOutcome, verification } = record;
                const fields = this.fieldsOf(record);
                return {
                    id,
                    origin,
                    account,
                    updatedAt,
                    ...(lastUsedAt ? { lastUsedAt } : {}),
                    ...(lastOutcome ? { lastOutcome } : {}),
                    ...(verification ? { verification } : {}),
                    ...(this.testing.has(id) ? { testing: this.testing.get(id)! } : {}),
                    ...(this.testWaits.has(id) ? { testAwaits: 'code' as const } : this.testApprovals.has(id) ? { testAwaits: 'approval' as const } : {}),
                    // Only the labels: field values stay encrypted like the password.
                    ...(fields.length ? { fields: fields.map((field) => ({ label: field.label, ...(field.uncertain ? { uncertain: true } : {}) })) } : {}),
                };
            }),
            ...(this.lockedRecords ? { lockedRecords: this.lockedRecords } : {}),
            management: (() => {
                const canReset = (state === 'locked' || state === 'unavailable') && Boolean(this.metadata || this.problem);
                return { canImport: state === 'ready', canRotate: state === 'ready', canReset, ...(canReset ? { resetWarning: RESET_WARNING } : {}) };
            })(),
            pending,
            ...(this.lastAction ? { lastAction: this.lastAction } : {}),
        };
    }
}

/**
 * Most additional login fields one saved login keeps.
 */
const MAX_LOGIN_FIELDS = 12;

/**
 * The comparable form of a field label ("Date of birth (DD.MM.YYYY)" → "date of birth dd mm yyyy").
 *
 * @private Wallet
 */
export function normalizeFieldLabel(label: string): string {
    return label
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Whether a saved field answers a field the page labels `asked`: the same label, or one containing the other
 * ("Date of birth" answers "Date of birth (DD.MM.YYYY)").
 *
 * @private Wallet
 */
export function fieldAnswers(saved: string, asked: string): boolean {
    const a = normalizeFieldLabel(saved);
    const b = normalizeFieldLabel(asked);
    return Boolean(a && b) && (a === b || ` ${b} `.includes(` ${a} `) || ` ${a} `.includes(` ${b} `));
}

/**
 * Applies owner changes to additional login fields: a change replaces the field of the same label, an empty value
 * removes it, other fields stay.
 *
 * @private Wallet
 */
export function mergeLoginFields(existing: readonly LoginField[], changes: readonly LoginField[]): LoginField[] {
    let fields = [...existing];
    for (const change of changes) {
        const label = change.label.replace(/\s+/g, ' ').trim();
        if (!label) throw new PtbkError('Every additional login field needs a name.', { kind: 'usage', effect: 'Nothing was saved.' });
        if (label.length > 80 || change.value.length > 1_000) throw new PtbkError(`The additional field "${label.slice(0, 40)}" is too long.`, { kind: 'usage', effect: 'Nothing was saved.' });
        fields = fields.filter((field) => normalizeFieldLabel(field.label) !== normalizeFieldLabel(label));
        if (change.value) fields.push({ label, value: change.value, ...(change.uncertain ? { uncertain: true } : {}) });
    }
    if (fields.length > MAX_LOGIN_FIELDS) throw new PtbkError(`A saved login keeps at most ${MAX_LOGIN_FIELDS} additional fields.`, { kind: 'usage', effect: 'Nothing was saved.' });
    return fields;
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
