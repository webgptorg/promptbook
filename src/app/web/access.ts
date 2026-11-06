import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PtbkError } from '../../common/errors.js';
import { encodeBase64Url } from '../encoding.js';
import { ensurePrivateDirectory, readPrivateFile, writePrivateFile } from '../files.js';

/**
 * The file holding members, passkeys, sessions and the pending setup secret (mode 0600, App data directory).
 */
const ACCESS_FILE = 'access.json';

/**
 * Session lifetime: idle and absolute timeouts, and how long a passkey assertion counts as fresh for step-up routes.
 *
 * @private App gateway
 */
export const SESSION_IDLE_TIMEOUT_MS = 8 * 60 * 60_000;

/**
 * However active, a session ends this long after sign-in.
 *
 * @private App gateway
 */
export const SESSION_ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60_000;

/**
 * How long a passkey assertion (sign-in or step-up) counts as fresh for `stepUp` routes.
 *
 * @private App gateway
 */
export const STEP_UP_WINDOW_MS = 5 * 60_000;

/**
 * How long a setup link is valid.
 *
 * @private App gateway
 */
export const SETUP_LINK_LIFETIME_MS = 30 * 60_000;

/**
 * `lastSeenAt` is persisted at most this often per session.
 */
const SEEN_PERSIST_INTERVAL_MS = 60_000;

/**
 * Engine API roles (`ROLES` of the contract).
 *
 * @private App gateway
 */
export type Role = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Every engine API permission (`PERMISSIONS` of the contract, in its order).
 *
 * @private App gateway
 */
export const ALL_PERMISSIONS = [
    'agents.read',
    'agents.write',
    'agents.delete',
    'agents.run',
    'chats.read',
    'chats.write',
    'files.read',
    'files.write',
    'wallet.read',
    'wallet.manage',
    'members.read',
    'members.manage',
    'api-tokens.manage',
    'settings.manage',
    'security.read',
    'audit.read',
    'runs.read',
    'runs.control',
    'tasks.read',
    'triggers.read',
    'triggers.manage',
    'integrations.read',
    'integrations.manage',
    'browser.control',
] as const;

/**
 * One engine API permission.
 *
 * @private App gateway
 */
export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * The engine's role policy: owners hold every permission (the first version's access is binary: the owner's).
 * Members created for the conformance suite carry their explicit permission sets instead.
 *
 * @private App gateway
 */
export function permissionsOfRole(role: Role): readonly Permission[] {
    switch (role) {
        case 'owner':
            return ALL_PERMISSIONS;
        case 'admin':
            return ALL_PERMISSIONS.filter((permission) => permission !== 'browser.control');
        case 'member':
            return ['agents.read', 'agents.write', 'agents.run', 'chats.read', 'chats.write', 'files.read', 'files.write', 'wallet.read', 'members.read', 'runs.read', 'tasks.read', 'triggers.read', 'integrations.read'];
        case 'viewer':
            return ['agents.read', 'chats.read', 'files.read', 'members.read', 'runs.read', 'tasks.read', 'triggers.read', 'integrations.read'];
    }
}

/**
 * A member who can sign in to this engine.
 *
 * @private App gateway
 */
export type StoredMember = {
    readonly id: string;
    displayName: string;
    role: Role;
    /** An explicit permission set (conformance members); otherwise the role's. */
    readonly permissions?: readonly Permission[];
    status: 'active' | 'disabled';
    readonly createdAt: string;
    lastSeenAt: string | null;
};

/**
 * A registered passkey (WebAuthn credential on the engine's hostname).
 *
 * @private App gateway
 */
export type StoredPasskey = {
    /** The credential ID (base64url), also the API's passkey ID when it fits; otherwise `apiId`. */
    readonly credentialId: string;
    readonly id: string;
    readonly memberId: string;
    readonly name: string;
    /** COSE public key, base64url. */
    readonly publicKey: string;
    counter: number;
    readonly transports: readonly string[];
    readonly createdAt: string;
    lastUsedAt: string | null;
    readonly attachment: 'platform' | 'cross-platform' | null;
    backedUp: boolean | null;
    /** The relying party (hostname) it was registered on. */
    readonly rpId: string;
};

/**
 * A server-side session: the cookie carries a random token whose digest is stored; the API lists only `id`.
 *
 * @private App gateway
 */
export type StoredSession = {
    readonly id: string;
    readonly tokenDigest: string;
    readonly memberId: string;
    readonly passkeyId: string | null;
    readonly createdAt: string;
    lastSeenAt: string;
    readonly expiresAt: string;
    readonly client: { readonly ip: string; readonly userAgent: string } | null;
    /** When a passkey assertion last confirmed this session (sign-in or step-up). */
    stepUpAt: string | null;
};

/**
 * The persisted access state.
 */
type AccessState = {
    v: 1;
    orgId: string;
    members: StoredMember[];
    passkeys: StoredPasskey[];
    sessions: StoredSession[];
    setup?: { secretDigest: string; expiresAt: string };
};

/**
 * What the gateway resolved for one request: the member, session and permissions handlers decide by.
 *
 * @private App gateway
 */
export type Actor = {
    readonly memberId: string;
    readonly sessionId: string;
    readonly displayName: string;
    readonly role: Role;
    readonly permissions: readonly Permission[];
    readonly stepUpFresh: boolean;
    readonly client: { readonly ip: string; readonly userAgent: string };
};

/**
 * A new random opaque ID (base64url of 16 bytes, which the contract's ID pattern accepts).
 *
 * @private App gateway
 */
export function newOpaqueId(): string {
    return encodeBase64Url(randomBytes(16));
}

/**
 * SHA-256 hex of a secret (tokens and setup secrets are stored only as digests).
 */
function digest(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
}

/**
 * Constant-time comparison of two hex digests.
 */
function digestsEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/**
 * The engine's App access state: members, passkeys and server-side sessions, persisted in the App data directory at
 * mode 0600. Session tokens and setup secrets exist only as digests on disk. A revoked session, or one of a removed
 * member or revoked passkey, fails on the next request, because every request resolves its token here.
 *
 * @private App gateway
 */
export class AccessStore {
    private state: AccessState = { v: 1, orgId: newOpaqueId(), members: [], passkeys: [], sessions: [] };
    private writes: Promise<void> = Promise.resolve();
    private readonly seenPersistedAt = new Map<string, number>();

    private constructor(private readonly directory: string) {}

    /** Loads (or creates) the access state of an App data directory. */
    public static async open(directory: string): Promise<AccessStore> {
        await ensurePrivateDirectory(directory);
        const store = new AccessStore(directory);
        const text = await readPrivateFile(directory, ACCESS_FILE);
        if (text) {
            let parsed: AccessState;
            try {
                parsed = JSON.parse(text) as AccessState;
            } catch {
                throw new PtbkError(`The App access file ${directory}/${ACCESS_FILE} is damaged; run \`ptbk connect --reset-owner\` to start the owner setup again.`, { kind: 'configuration' });
            }
            if (parsed.v !== 1 || !Array.isArray(parsed.members) || !Array.isArray(parsed.passkeys) || !Array.isArray(parsed.sessions)) throw new PtbkError(`The App access file ${directory}/${ACCESS_FILE} has an unknown format.`, { kind: 'configuration' });
            store.state = parsed;
        }
        store.prune();
        return store;
    }

    /** Persists the state (serialized). */
    private persist(): Promise<void> {
        const text = `${JSON.stringify(this.state, null, 2)}\n`;
        this.writes = this.writes.then(() => writePrivateFile(this.directory, ACCESS_FILE, text)).catch(() => undefined);
        return this.writes;
    }

    /** Drops expired sessions and an expired setup secret. */
    private prune(now = Date.now()): void {
        this.state.sessions = this.state.sessions.filter((session) => this.sessionAlive(session, now));
        if (this.state.setup && Date.parse(this.state.setup.expiresAt) <= now) delete this.state.setup;
    }

    /** Whether a session is within both timeouts and belongs to an active member. */
    private sessionAlive(session: StoredSession, now = Date.now()): boolean {
        if (Date.parse(session.expiresAt) <= now || Date.parse(session.lastSeenAt) + SESSION_IDLE_TIMEOUT_MS <= now) return false;
        const member = this.member(session.memberId);
        if (!member || member.status !== 'active') return false;
        return session.passkeyId === null || this.state.passkeys.some((passkey) => passkey.id === session.passkeyId);
    }

    /** The organization ID the API reports (stable per engine). */
    public get orgId(): string {
        return this.state.orgId;
    }

    /** Whether an owner has set up access. */
    public get hasOwner(): boolean {
        return this.state.members.some((member) => member.role === 'owner' && member.status === 'active');
    }

    /** Active members. */
    public members(): readonly StoredMember[] {
        return this.state.members.filter((member) => member.status === 'active');
    }

    /** One member by ID. */
    public member(id: string): StoredMember | undefined {
        return this.state.members.find((member) => member.id === id);
    }

    /** Passkeys (optionally of one member), newest first. */
    public passkeys(memberId?: string): readonly StoredPasskey[] {
        return this.state.passkeys.filter((passkey) => memberId === undefined || passkey.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    /** One passkey by its WebAuthn credential ID. */
    public passkeyByCredential(credentialId: string): StoredPasskey | undefined {
        return this.state.passkeys.find((passkey) => passkey.credentialId === credentialId);
    }

    /** Live sessions (optionally of one member), most recently seen first. */
    public sessions(memberId?: string): readonly StoredSession[] {
        this.prune();
        return this.state.sessions.filter((session) => memberId === undefined || session.memberId === memberId).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    }

    /** The permissions a member holds. */
    public permissionsOf(member: StoredMember): readonly Permission[] {
        return member.permissions ?? permissionsOfRole(member.role);
    }

    /**
     * A new setup secret (128 bits, single use, valid 30 minutes) replacing any earlier one. Only its digest is
     * stored; the caller prints the link in the engine's terminal and nowhere else.
     */
    public async createSetupSecret(): Promise<{ readonly secret: string; readonly expiresAt: Date }> {
        const secret = encodeBase64Url(randomBytes(16));
        const expiresAt = new Date(Date.now() + SETUP_LINK_LIFETIME_MS);
        this.state.setup = { secretDigest: digest(secret), expiresAt: expiresAt.toISOString() };
        await this.persist();
        return { secret, expiresAt };
    }

    /** Whether a setup secret is the pending one (constant time; never consumes it). */
    public setupSecretValid(secret: string): boolean {
        this.prune();
        return Boolean(this.state.setup && /^[A-Za-z0-9_-]{22}$/.test(secret) && digestsEqual(digest(secret), this.state.setup.secretDigest));
    }

    /**
     * Revokes every passkey and session and makes the owner set up access again (the owner reset, run in the
     * engine's terminal). Members other than owners are disabled too: the reset is a fresh start. The caller issues
     * the new setup link once the engine's address works.
     */
    public async resetOwner(): Promise<void> {
        for (const member of this.state.members) member.status = 'disabled';
        this.state.passkeys = [];
        this.state.sessions = [];
        delete this.state.setup;
        await this.persist();
    }

    /** Adds a member (the owner from setup, or a conformance member). */
    public async addMember(input: { readonly displayName: string; readonly role: Role; readonly permissions?: readonly Permission[] }): Promise<StoredMember> {
        const member: StoredMember = { id: newOpaqueId(), displayName: input.displayName, role: input.role, ...(input.permissions ? { permissions: [...input.permissions] } : {}), status: 'active', createdAt: new Date().toISOString(), lastSeenAt: null };
        this.state.members.push(member);
        await this.persist();
        return member;
    }

    /** Completes the owner setup: consumes the secret, adds the owner with the verified passkey. */
    public async completeSetup(secret: string, passkey: Omit<StoredPasskey, 'id' | 'memberId' | 'createdAt' | 'lastUsedAt'>): Promise<{ readonly member: StoredMember; readonly passkey: StoredPasskey }> {
        if (!this.setupSecretValid(secret)) throw new PtbkError('The setup link is no longer valid.', { kind: 'usage' });
        if (this.hasOwner) throw new PtbkError('The engine already has an owner.', { kind: 'usage' });
        delete this.state.setup;
        const member: StoredMember = { id: newOpaqueId(), displayName: 'Owner', role: 'owner', status: 'active', createdAt: new Date().toISOString(), lastSeenAt: null };
        this.state.members.push(member);
        const stored = this.storePasskey(member.id, passkey);
        await this.persist();
        return { member, passkey: stored };
    }

    /** Adds a verified passkey to a member. */
    private storePasskey(memberId: string, passkey: Omit<StoredPasskey, 'id' | 'memberId' | 'createdAt' | 'lastUsedAt'>): StoredPasskey {
        const id = /^[A-Za-z0-9_-]{1,64}$/.test(passkey.credentialId) ? passkey.credentialId : newOpaqueId();
        const stored: StoredPasskey = { ...passkey, id, memberId, createdAt: new Date().toISOString(), lastUsedAt: null };
        this.state.passkeys.push(stored);
        return stored;
    }

    /** Records a successful assertion (counter, backup state, last use). */
    public async passkeyUsed(passkeyId: string, counter: number, backedUp: boolean | null): Promise<void> {
        const passkey = this.state.passkeys.find((item) => item.id === passkeyId);
        if (!passkey) return;
        passkey.counter = counter;
        passkey.backedUp = backedUp;
        passkey.lastUsedAt = new Date().toISOString();
        await this.persist();
    }

    /** Creates a session (a new ID and token on every sign-in) and returns the cookie token. */
    public async signIn(memberId: string, passkeyId: string | null, client: { readonly ip: string; readonly userAgent: string } | null, options: { readonly stepUp?: boolean } = {}): Promise<{ readonly token: string; readonly session: StoredSession }> {
        const token = encodeBase64Url(randomBytes(16));
        const now = new Date();
        const session: StoredSession = {
            id: newOpaqueId(),
            tokenDigest: digest(token),
            memberId,
            passkeyId,
            createdAt: now.toISOString(),
            lastSeenAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_TIMEOUT_MS).toISOString(),
            client,
            stepUpAt: options.stepUp === false ? null : now.toISOString(),
        };
        this.state.sessions.push(session);
        const member = this.member(memberId);
        if (member) member.lastSeenAt = now.toISOString();
        await this.persist();
        return { token, session };
    }

    /** Resolves a cookie token to its actor, or `undefined` (expired, revoked, unknown). */
    public authenticate(token: string, client: { readonly ip: string; readonly userAgent: string }): Actor | undefined {
        if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return undefined;
        const tokenDigest = digest(token);
        const now = Date.now();
        const session = this.state.sessions.find((item) => digestsEqual(item.tokenDigest, tokenDigest));
        if (!session || !this.sessionAlive(session, now)) return undefined;
        const member = this.member(session.memberId);
        if (!member) return undefined;
        session.lastSeenAt = new Date(now).toISOString();
        member.lastSeenAt = session.lastSeenAt;
        if (now - (this.seenPersistedAt.get(session.id) ?? 0) > SEEN_PERSIST_INTERVAL_MS) {
            this.seenPersistedAt.set(session.id, now);
            void this.persist();
        }
        return {
            memberId: member.id,
            sessionId: session.id,
            displayName: member.displayName,
            role: member.role,
            permissions: this.permissionsOf(member),
            stepUpFresh: session.stepUpAt !== null && now - Date.parse(session.stepUpAt) < STEP_UP_WINDOW_MS,
            client,
        };
    }

    /** Marks a session freshly confirmed by a passkey assertion. */
    public async confirmStepUp(sessionId: string): Promise<void> {
        const session = this.state.sessions.find((item) => item.id === sessionId);
        if (!session) return;
        session.stepUpAt = new Date().toISOString();
        await this.persist();
    }

    /** Ends sessions matching a predicate; returns how many. */
    public async revokeSessions(match: (session: StoredSession) => boolean): Promise<number> {
        const before = this.state.sessions.length;
        this.state.sessions = this.state.sessions.filter((session) => !match(session));
        const revoked = before - this.state.sessions.length;
        if (revoked) await this.persist();
        return revoked;
    }

    /** Revokes a passkey and every session it signed in. */
    public async revokePasskey(passkeyId: string): Promise<boolean> {
        const before = this.state.passkeys.length;
        this.state.passkeys = this.state.passkeys.filter((passkey) => passkey.id !== passkeyId);
        if (before === this.state.passkeys.length) return false;
        this.state.sessions = this.state.sessions.filter((session) => session.passkeyId !== passkeyId);
        await this.persist();
        return true;
    }
}
