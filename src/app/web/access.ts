import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { api, protocol } from '../../vendor/app-platform.js';
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
    'browser.watch',
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
    /** Dashboard membership, absent for the original owner and engine invitations. */
    readonly dashboardUserId?: string;
    readonly joinedAt?: string;
    readonly ticketId?: string;
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

/** Verified dashboard claims; verification is exclusively the platform protocol's. @private App gateway */
export type AccessTicket = { readonly ticketId: string; readonly dashboardUserId: string; readonly displayName: string; readonly email: string; readonly proposedRole: 'admin' | 'member'; readonly expiresAt: string };

/** A verified credential before it belongs to a member. @private App gateway */
export type NewPasskey = Omit<StoredPasskey, 'id' | 'memberId' | 'createdAt' | 'lastUsedAt'>;

/** A public request, never its code or credential. @private App gateway */
export type AccessRequest = { readonly id: string; readonly displayName: string; readonly email: string; readonly proposedRole: 'admin' | 'member'; readonly createdAt: string; readonly expiresAt: string };

/** An opaque dashboard acknowledgment. @private App gateway */
export type HeartbeatAck = { readonly id: string; readonly outcome: 'approved' | 'declined' | 'removed' | 'revoked' | 'refused-owner' | 'refused-disabled' | 'not-found' };

/** A pending engine-issued invitation, with the secret kept separately as a digest. @private App gateway */
export type StoredInvite = { readonly id: string; readonly role: Role; readonly createdBy: string; readonly createdAt: string; readonly expiresAt: string; readonly secretDigest: string };

/** The gateway keeps pending credentials apart from the sign-in credential store. */
type Joining = { request: AccessRequest; ticketId: string | null; dashboardUserId: string | null; codeDigest: string; pollDigest: string | null; attempts: number; state: 'pending' | 'approved' | 'declined'; credential?: NewPasskey; memberId?: string; passkeyId?: string };

/** Content-free access audit entries, in a durable hash chain. @private App gateway */
export type AccessAudit = { readonly id: string; readonly seq: number; readonly at: string; readonly actor: { readonly kind: 'member'; readonly memberId: string } | { readonly kind: 'system' }; readonly action: string; readonly target: { readonly kind: string; readonly id: string; readonly name: null } | null; readonly outcome: 'success' | 'denied' | 'failed'; readonly client: StoredSession['client']; readonly prevHash: string | null; readonly details: { readonly code: string } | null; readonly hash: string };

/** The additive v2 migration preserves every existing member, passkey, session and pending setup secret. */
type AccessState = { v: 2; orgId: string; members: StoredMember[]; passkeys: StoredPasskey[]; sessions: StoredSession[]; setup?: { secretDigest: string; expiresAt: string }; joining: Joining[]; spent: { id: string; until: number }[]; acks: HeartbeatAck[]; revocations: HeartbeatAck[]; invites: StoredInvite[]; dashboardRemovals: boolean; audit: AccessAudit[] };

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

/** The OS-authenticated owner of the local desktop pipe. Never a gateway member, session or sign-in credential. @private desktop app */
export const DESKTOP_OWNER: Actor = Object.freeze({
    memberId: 'local-desktop-owner', sessionId: 'local-desktop', displayName: 'Local owner', role: 'owner',
    permissions: ALL_PERMISSIONS, stepUpFresh: true, client: { ip: '127.0.0.1', userAgent: 'Promptbook Desktop' },
});

/** Authorization changed while a write was queued. @private App gateway */
export class AccessDenied extends Error {
    public constructor(public readonly code: 'unauthenticated' | 'forbidden' | 'step-up-required') { super(code); }
}

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
    private state: AccessState = { v: 2, orgId: newOpaqueId(), members: [], passkeys: [], sessions: [], joining: [], spent: [], acks: [], revocations: [], invites: [], dashboardRemovals: true, audit: [] };
    private writes: Promise<void> = Promise.resolve();
    private lastWrite: Promise<unknown> = Promise.resolve();
    private writeFailed = false;
    private readonly seenPersistedAt = new Map<string, number>();

    private constructor(private readonly directory: string) {}

    /** Loads legacy v1 without replacing its identities or credentials. Invalid files fail closed. */
    public static async open(directory: string): Promise<AccessStore> {
        await ensurePrivateDirectory(directory);
        const store = new AccessStore(directory);
        const text = await readPrivateFile(directory, ACCESS_FILE);
        if (text) {
            try {
                const parsed = JSON.parse(text);
                if (![1, 2].includes(parsed.v) || typeof parsed.orgId !== 'string' || !['members', 'passkeys', 'sessions'].every(key => Array.isArray(parsed[key]))) throw new Error('format');
                for (const key of ['joining', 'spent', 'acks', 'revocations', 'invites', 'audit']) if (parsed[key] !== undefined && !Array.isArray(parsed[key])) throw new Error('format');
                store.state = { ...store.state, ...parsed, v: 2 };
            } catch {
                throw new PtbkError(`The App access file ${directory}/${ACCESS_FILE} is damaged or has an unknown format. Restore its backup before starting the App connection.`, { kind: 'configuration' });
            }
        }
        return store;
    }

    /** Serializes read/modify/write; only a durably written draft becomes visible to authorization. */
    private mutate<T>(operation: (draft: AccessState) => T): Promise<T> {
        const task = this.writes.then(async () => {
            const draft = structuredClone(this.state);
            this.prune(draft);
            const result = operation(draft);
            try {
                if (this.writeFailed || JSON.stringify(draft) !== JSON.stringify(this.state)) await writePrivateFile(this.directory, ACCESS_FILE, `${JSON.stringify(draft, null, 2)}\n`);
            } catch (error) {
                this.writeFailed = true;
                throw error;
            }
            this.state = draft;
            this.writeFailed = false;
            return structuredClone(result);
        });
        this.lastWrite = task;
        // A failed write is returned to its caller, while the queue stays usable for a deliberate retry.
        this.writes = task.then(() => undefined, () => undefined);
        return task;
    }

    /** Rechecks current authority inside the write queue; even a racing revocation cannot grant stale authority. */
    private async authorized<T>(actor: Actor | undefined, permission: Permission, action: string, kind: string | undefined, id: string | undefined, operation: (state: AccessState) => T, stepUp = true): Promise<T> {
        const result = await this.mutate(state => {
            if (actor && actor !== DESKTOP_OWNER) {
                const session = state.sessions.find(item => item.id === actor.sessionId && item.memberId === actor.memberId);
                const member = state.members.find(item => item.id === actor.memberId && item.status === 'active');
                const code = !session || !member || !this.sessionAlive(session, state) ? 'unauthenticated'
                    : !this.permissionsOf(member).includes(permission) ? 'forbidden'
                    : stepUp && (!session.stepUpAt || Date.now() - Date.parse(session.stepUpAt) >= STEP_UP_WINDOW_MS) ? 'step-up-required' : undefined;
                if (code) { this.auditIn(state, action, actor, kind, id, 'denied', code); return { denied: code } as const; }
            }
            return { value: operation(state) };
        });
        if ('denied' in result && result.denied) throw new AccessDenied(result.denied);
        return (result as { value: T }).value;
    }

    /** Waits for the last write and propagates its failure. */
    public async flush(): Promise<void> { await this.lastWrite; }

    /** Expires requests durably before reporting their count or acknowledgments. */
    public async settle(): Promise<void> { await this.mutate(() => undefined); }

    /** Drops expired credentials and declines expired requests without retaining their passkeys. */
    private prune(state: AccessState, now = Date.now()): void {
        state.sessions = state.sessions.filter(session => this.sessionAlive(session, state, now));
        if (state.setup && Date.parse(state.setup.expiresAt) <= now) delete state.setup;
        for (const entry of state.joining) if (entry.state === 'pending' && Date.parse(entry.request.expiresAt) <= now) this.closeRequest(state, entry);
        state.joining = state.joining.filter(entry => entry.state === 'pending' || Date.parse(entry.request.expiresAt) + 86_400_000 > now);
        state.spent = state.spent.filter(entry => entry.until > now);
        state.invites = state.invites.filter(entry => Date.parse(entry.expiresAt) > now);
    }

    /** A session always resolves against the current member and passkey, not its original permission set. */
    private sessionAlive(session: StoredSession, state = this.state, now = Date.now()): boolean {
        return Date.parse(session.expiresAt) > now && Date.parse(session.lastSeenAt) + SESSION_IDLE_TIMEOUT_MS > now
            && state.members.some(member => member.id === session.memberId && member.status === 'active')
            && (session.passkeyId === null || state.passkeys.some(passkey => passkey.id === session.passkeyId && passkey.memberId === session.memberId));
    }

    /** Stable organization identity. */
    public get orgId(): string { return this.state.orgId; }
    /** Owner setup remains complete across migrations. */
    public get hasOwner(): boolean { return this.state.members.some(member => member.role === 'owner' && member.status === 'active'); }
    /** A disabled former owner also permanently closes cloud commissioning. */
    public get canBootstrapOwner(): boolean { return !this.state.members.some(member => member.role === 'owner'); }
    /** The owner-controlled dashboard removal policy. */
    public get dashboardRemovals(): boolean { return this.state.dashboardRemovals; }
    /** Active members, with no mutable references into authorization state. */
    public members(): readonly StoredMember[] { return structuredClone(this.state.members.filter(member => member.status === 'active')); }
    /** One member, including a disabled record. */
    public member(id: string): StoredMember | undefined { return structuredClone(this.state.members.find(member => member.id === id)); }
    /** Credentials registered for actual members; pending credentials never appear here. */
    public passkeys(memberId?: string): readonly StoredPasskey[] { return structuredClone(this.state.passkeys.filter(key => memberId === undefined || key.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }
    /** One registered credential. */
    public passkeyByCredential(id: string): StoredPasskey | undefined { return structuredClone(this.state.passkeys.find(key => key.credentialId === id)); }
    /** Unexpired sessions. */
    public sessions(memberId?: string): readonly StoredSession[] { return structuredClone(this.state.sessions.filter(session => this.sessionAlive(session) && (memberId === undefined || session.memberId === memberId)).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))); }
    /** Explicit conformance permissions or ordinary role permissions. */
    public permissionsOf(member: StoredMember): readonly Permission[] { return member.permissions ?? permissionsOfRole(member.role); }

    /** Creates a replacement setup secret, stored only as a digest. */
    public async createSetupSecret(initialOwnerOnly = false): Promise<{ readonly secret: string; readonly expiresAt: Date }> {
        const secret = newOpaqueId();
        const expiresAt = new Date(Date.now() + SETUP_LINK_LIFETIME_MS);
        await this.mutate(state => {
            if (initialOwnerOnly && state.members.some(member => member.role === 'owner')) throw new PtbkError('Initial setup has ended.', { kind: 'usage' });
            state.setup = { secretDigest: digest(secret), expiresAt: expiresAt.toISOString() };
        });
        return { secret, expiresAt };
    }

    /** Checks the unconsumed setup secret. */
    public setupSecretValid(secret: string): boolean { return this.setupValid(this.state, secret); }
    /** The setup check repeated inside the serialized transaction. */
    private setupValid(state: AccessState, secret: string): boolean { return Boolean(state.setup && Date.parse(state.setup.expiresAt) > Date.now() && /^[A-Za-z0-9_-]{22}$/.test(secret) && digestsEqual(digest(secret), state.setup.secretDigest)); }

    /** The explicit local reset ends all access, including invitations and waiting ceremonies. */
    public async resetOwner(): Promise<void> {
        await this.mutate(state => {
            for (const member of state.members) member.status = 'disabled';
            for (const entry of state.joining) this.closeRequest(state, entry);
            state.passkeys = []; state.sessions = []; state.invites = [];
            delete state.setup;
        });
    }

    /** Adds an owner or a conformance member. */
    public async addMember(input: { readonly displayName: string; readonly role: Role; readonly permissions?: readonly Permission[] }): Promise<StoredMember> {
        return await this.mutate(state => this.addMemberTo(state, input));
    }

    /** Creates a member in a transaction. */
    private addMemberTo(state: AccessState, input: { readonly displayName: string; readonly role: Role; readonly permissions?: readonly Permission[]; readonly dashboardUserId?: string; readonly joinedAt?: string; readonly ticketId?: string }): StoredMember {
        const member: StoredMember = { ...input, id: newOpaqueId(), status: 'active', createdAt: new Date().toISOString(), lastSeenAt: null };
        state.members.push(member); return member;
    }

    /** Consumes setup and stores its owner/credential atomically. */
    public async completeSetup(secret: string, credential: NewPasskey): Promise<{ readonly member: StoredMember; readonly passkey: StoredPasskey }> {
        return await this.mutate(state => {
            if (!this.setupValid(state, secret) || state.members.some(member => member.status === 'active' && member.role === 'owner')) throw new PtbkError('The setup link is no longer valid.', { kind: 'usage' });
            const member = this.addMemberTo(state, { displayName: 'Owner', role: 'owner' });
            const passkey = this.storePasskey(state, member.id, credential);
            delete state.setup; return { member, passkey };
        });
    }

    /** One WebAuthn credential can belong to only one member or waiting request. */
    private credentialExists(state: AccessState, id: string): boolean { return state.passkeys.some(key => key.credentialId === id) || state.joining.some(entry => entry.credential?.credentialId === id); }
    /** Inserts a credential after all uniqueness checks. */
    private storePasskey(state: AccessState, memberId: string, credential: NewPasskey): StoredPasskey {
        if (state.passkeys.some(key => key.credentialId === credential.credentialId)) throw new PtbkError('The passkey is already registered.', { kind: 'conflict' });
        const id = /^[A-Za-z0-9_-]{1,64}$/.test(credential.credentialId) ? credential.credentialId : newOpaqueId();
        const passkey = { ...credential, id, memberId, createdAt: new Date().toISOString(), lastUsedAt: null };
        state.passkeys.push(passkey); return passkey;
    }

    /** Records a successful assertion. */
    public async passkeyUsed(id: string, counter: number, backedUp: boolean | null): Promise<void> {
        await this.mutate(state => { const key = state.passkeys.find(item => item.id === id); if (key) { key.counter = counter; key.backedUp = backedUp; key.lastUsedAt = new Date().toISOString(); } });
    }

    /** Creates a new session, after rechecking that its member and credential still exist. */
    public async signIn(memberId: string, passkeyId: string | null, client: StoredSession['client'], options: { readonly stepUp?: boolean } = {}): Promise<{ readonly token: string; readonly session: StoredSession }> {
        return await this.mutate(state => this.signInTo(state, memberId, passkeyId, client, options.stepUp !== false));
    }

    /** Signs in within a transaction (also used when consuming the join poll token). */
    private signInTo(state: AccessState, memberId: string, passkeyId: string | null, client: StoredSession['client'], stepUp = true): { token: string; session: StoredSession } {
        const member = state.members.find(item => item.id === memberId && item.status === 'active');
        if (!member || (passkeyId !== null && !state.passkeys.some(key => key.id === passkeyId && key.memberId === memberId))) throw new PtbkError('Access is no longer active.', { kind: 'usage' });
        const token = newOpaqueId(); const now = new Date();
        const session: StoredSession = { id: newOpaqueId(), tokenDigest: digest(token), memberId, passkeyId, createdAt: now.toISOString(), lastSeenAt: now.toISOString(), expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_TIMEOUT_MS).toISOString(), client, stepUpAt: stepUp ? now.toISOString() : null };
        state.sessions.push(session); member.lastSeenAt = now.toISOString(); return { token, session };
    }

    /** Resolves current authority on every request; a persistence failure closes access until recovered. */
    public authenticate(token: string, client: NonNullable<StoredSession['client']>): Actor | undefined {
        if (this.writeFailed || !/^[A-Za-z0-9_-]{22}$/.test(token)) return undefined;
        const session = this.state.sessions.find(item => digestsEqual(item.tokenDigest, digest(token)));
        if (!session || !this.sessionAlive(session)) return undefined;
        const member = this.state.members.find(item => item.id === session.memberId)!;
        const now = Date.now();
        if (now - (this.seenPersistedAt.get(session.id) ?? 0) > SEEN_PERSIST_INTERVAL_MS) {
            this.seenPersistedAt.set(session.id, now);
            void this.mutate(state => {
                const current = state.sessions.find(item => item.id === session.id);
                const person = state.members.find(item => item.id === session.memberId);
                if (current && person) { current.lastSeenAt = new Date(now).toISOString(); person.lastSeenAt = current.lastSeenAt; }
            }).catch(() => undefined);
        }
        return { memberId: member.id, sessionId: session.id, displayName: member.displayName, role: member.role, permissions: this.permissionsOf(member), stepUpFresh: session.stepUpAt !== null && now - Date.parse(session.stepUpAt) < STEP_UP_WINDOW_MS, client };
    }

    /** Marks a still-live session freshly confirmed. */
    public async confirmStepUp(id: string): Promise<void> { await this.mutate(state => { const session = state.sessions.find(item => item.id === id); if (session) session.stepUpAt = new Date().toISOString(); }); }
    /** Ends matching sessions. */
    public async revokeSessions(match: (session: StoredSession) => boolean): Promise<number> { return await this.mutate(state => { const before = state.sessions.length; state.sessions = state.sessions.filter(session => !match(session)); return before - state.sessions.length; }); }
    /** Ends a credential and its sessions. */
    public async revokePasskey(id: string): Promise<boolean> { return await this.mutate(state => { const before = state.passkeys.length; state.passkeys = state.passkeys.filter(key => key.id !== id); state.sessions = state.sessions.filter(session => session.passkeyId !== id); return before !== state.passkeys.length; }); }

    /** Lists public pending requests only, oldest first. */
    public accessRequests(): readonly AccessRequest[] { return structuredClone(this.state.joining.filter(entry => entry.state === 'pending' && Date.parse(entry.request.expiresAt) > Date.now()).map(entry => entry.request).sort((a, b) => a.createdAt.localeCompare(b.createdAt))); }
    /** Checks a verified ticket against durable state, also repeated at the write boundary. */
    public ticketStatus(ticket: AccessTicket): 'ok' | 'used' | 'already-member' | 'full' { return this.ticketStatusIn(this.state, ticket); }
    /** Ticket state check in a transaction. */
    private ticketStatusIn(state: AccessState, ticket: AccessTicket): 'ok' | 'used' | 'already-member' | 'full' {
        if (state.spent.some(entry => entry.id === ticket.ticketId && entry.until > Date.now())) return 'used';
        if (state.members.some(member => member.dashboardUserId === ticket.dashboardUserId && member.status === 'active')) return 'already-member';
        const pending = state.joining.filter(entry => entry.state === 'pending' && Date.parse(entry.request.expiresAt) > Date.now());
        return (!pending.some(entry => entry.dashboardUserId === ticket.dashboardUserId) && pending.length >= api.MAX_PENDING_ACCESS_REQUESTS) || state.spent.length >= 10_000 ? 'full' : 'ok';
    }

    /** Stores ticket consumption, the pending credential and hashed code/poll token in one durable transaction. */
    public async requestAccess(ticket: AccessTicket, credential: NewPasskey): Promise<{ kind: 'waiting'; code: string; request: string } | { kind: 'used' | 'already-member' | 'full' | 'invalid' }> {
        return await this.mutate(state => {
            const status = this.ticketStatusIn(state, ticket); if (status !== 'ok') return { kind: status };
            if (Date.parse(ticket.expiresAt) <= Date.now() || this.credentialExists(state, credential.credentialId)) return { kind: 'invalid' };
            for (const entry of state.joining) if (entry.dashboardUserId === ticket.dashboardUserId && entry.state === 'pending') this.closeRequest(state, entry);
            const code = String(randomInt(1_000_000)).padStart(6, '0'); const request = newOpaqueId(); const now = Date.now();
            state.spent.push({ id: ticket.ticketId, until: Date.parse(ticket.expiresAt) + protocol.ACCESS_TICKET_MAX_SKEW_MS });
            state.joining.push({ request: { id: newOpaqueId(), displayName: ticket.displayName, email: ticket.email, proposedRole: ticket.proposedRole, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + api.ACCESS_REQUEST_TTL_MS).toISOString() }, ticketId: ticket.ticketId, dashboardUserId: ticket.dashboardUserId, credential, codeDigest: digest(code), pollDigest: digest(request), attempts: 0, state: 'pending' });
            return { kind: 'waiting', code, request };
        });
    }

    /** Queues the latest outcome of a dashboard ID without losing an unsent newer outcome. */
    private ack(state: AccessState, id: string, outcome: HeartbeatAck['outcome']): void { state.acks = state.acks.filter(entry => entry.id !== id); state.acks.push({ id, outcome }); }
    /** Discards a pending credential and records its declined outcome. */
    private closeRequest(state: AccessState, entry: Joining, acknowledge = true): void { entry.state = 'declined'; delete entry.credential; if (acknowledge && entry.ticketId) this.ack(state, entry.ticketId, 'declined'); }

    /** Approves once, with per-request brute-force protection and an atomic member/passkey transition. */
    public async approveAccess(id: string, code: string, role: Role, actor?: Actor): Promise<{ kind: 'approved'; member: StoredMember } | { kind: 'not-found' | 'access-code-mismatch' }> {
        return await this.authorized(actor, 'members.manage', 'access-request.approve', 'access-request', id, state => {
            const entry = state.joining.find(item => item.request.id === id && item.state === 'pending');
            if (!entry || !entry.credential) return { kind: 'not-found' };
            if (!digestsEqual(digest(code), entry.codeDigest)) {
                entry.attempts++; if (entry.attempts >= api.MAX_ACCESS_CODE_ATTEMPTS) this.closeRequest(state, entry);
                this.auditIn(state, 'access-request.approve', actor, 'access-request', id, 'failed', 'access-code-mismatch');
                return { kind: 'access-code-mismatch' };
            }
            const member = this.addMemberTo(state, { displayName: entry.request.displayName, role, dashboardUserId: entry.dashboardUserId!, joinedAt: entry.request.createdAt, ticketId: entry.ticketId! });
            const passkey = this.storePasskey(state, member.id, entry.credential);
            delete entry.credential; entry.state = 'approved'; entry.memberId = member.id; entry.passkeyId = passkey.id;
            this.ack(state, entry.ticketId!, 'approved'); this.auditIn(state, 'access-request.approve', actor, 'member', member.id);
            return { kind: 'approved', member };
        });
    }

    /** Declines a request, leaving the waiting browser a nonsecret outcome. */
    public async declineAccess(id: string, actor?: Actor): Promise<boolean> { return await this.authorized(actor, 'members.manage', 'access-request.decline', 'access-request', id, state => { const entry = state.joining.find(item => item.request.id === id && item.state === 'pending'); if (!entry) return false; this.closeRequest(state, entry); this.auditIn(state, 'access-request.decline', actor, 'access-request', id); return true; }, false); }

    /** The poll credential signs in exactly once, and is never a member/session ID. */
    public async joinStatus(request: string, client: StoredSession['client']): Promise<{ kind: 'waiting' | 'declined' | 'unknown' } | { kind: 'approved'; token: string }> {
        if (!/^[A-Za-z0-9_-]{22}$/.test(request)) return { kind: 'unknown' };
        return await this.mutate(state => {
            const entry = state.joining.find(item => item.pollDigest && digestsEqual(item.pollDigest, digest(request)));
            if (!entry) return { kind: 'unknown' };
            if (entry.state === 'pending') return { kind: 'waiting' };
            if (entry.state === 'declined' || !state.members.some(member => member.id === entry.memberId && member.status === 'active') || !state.passkeys.some(key => key.id === entry.passkeyId)) return { kind: 'declined' };
            const signed = this.signInTo(state, entry.memberId!, entry.passkeyId!, client, false);
            entry.pollDigest = null; return { kind: 'approved', token: signed.token };
        });
    }

    /** Mutating a role uses the same transaction as counting the remaining owners. */
    public async updateMember(id: string, role: Role, actor?: Actor): Promise<{ kind: 'updated'; member: StoredMember } | { kind: 'not-found' | 'last-owner' }> {
        return await this.authorized(actor, 'members.manage', 'member.update', 'member', id, state => { const member = state.members.find(item => item.id === id && item.status === 'active'); if (!member) return { kind: 'not-found' }; if (role !== 'owner' && this.lastOwner(state, member)) return { kind: 'last-owner' }; member.role = role; this.auditIn(state, 'member.update', actor, 'member', id); return { kind: 'updated', member }; });
    }
    /** Whether removing this owner would lock everyone out. */
    private lastOwner(state: AccessState, member: StoredMember): boolean { return member.role === 'owner' && state.members.filter(item => item.status === 'active' && item.role === 'owner').length <= 1; }
    /** Disables access immediately, including every passkey and session, retaining the member's identity for history. */
    private disable(state: AccessState, member: StoredMember, fromDashboard: boolean): void {
        member.status = 'disabled'; state.passkeys = state.passkeys.filter(key => key.memberId !== member.id); state.sessions = state.sessions.filter(session => session.memberId !== member.id);
        for (const entry of state.joining) if (entry.memberId === member.id || (member.dashboardUserId && entry.dashboardUserId === member.dashboardUserId)) this.closeRequest(state, entry, false);
        if (!fromDashboard && member.ticketId) this.ack(state, member.ticketId, 'removed');
    }
    /** Local member removal. */
    public async removeMember(id: string, actor?: Actor): Promise<{ kind: 'removed' | 'not-found' | 'last-owner' }> { return await this.authorized(actor, 'members.manage', 'member.remove', 'member', id, state => { const member = state.members.find(item => item.id === id && item.status === 'active'); if (!member) return { kind: 'not-found' }; if (this.lastOwner(state, member)) return { kind: 'last-owner' }; this.disable(state, member, false); this.auditIn(state, 'member.remove', actor, 'member', id); return { kind: 'removed' }; }); }
    /** Owner-controlled removal policy, separate from other settings. */
    public async setDashboardRemovals(enabled: boolean, actor?: Actor): Promise<void> { await this.authorized(actor, 'settings.manage', 'settings.dashboard-removals', undefined, undefined, state => { state.dashboardRemovals = enabled; this.auditIn(state, 'settings.dashboard-removals', actor); }); }

    /** Applies only a protocol-verified revocation; stale memberships and last-owner protection are checked atomically. */
    public async applyRevocation(revocation: { readonly revocationId: string; readonly dashboardUserId: string; readonly issuedAt: string }): Promise<HeartbeatAck['outcome']> {
        return await this.mutate(state => {
            const remembered = state.revocations.find(entry => entry.id === revocation.revocationId);
            if (remembered) { this.ack(state, remembered.id, remembered.outcome); return remembered.outcome; }
            const member = state.members.find(item => item.dashboardUserId === revocation.dashboardUserId && item.status === 'active');
            const pending = state.joining.filter(entry => entry.dashboardUserId === revocation.dashboardUserId && entry.state === 'pending');
            const joinedAt = [member?.joinedAt, ...pending.map(entry => entry.request.createdAt)].filter((at): at is string => !!at).sort().at(-1);
            let outcome: HeartbeatAck['outcome'];
            if (joinedAt && protocol.revocationPredates(revocation, joinedAt)) outcome = 'not-found';
            else {
                for (const entry of pending) this.closeRequest(state, entry, false);
                outcome = !state.dashboardRemovals ? 'refused-disabled' : !member ? 'not-found' : this.lastOwner(state, member) ? 'refused-owner' : 'revoked';
                if (outcome === 'revoked' && member) { this.disable(state, member, true); this.auditIn(state, 'member.revoke', undefined, 'member', member.id); }
            }
            state.revocations.push({ id: revocation.revocationId, outcome }); state.revocations = state.revocations.slice(-1000);
            this.ack(state, revocation.revocationId, outcome); return outcome;
        });
    }
    /** A bounded heartbeat batch, oldest first. */
    public acks(): readonly HeartbeatAck[] { return structuredClone(this.state.acks.slice(0, protocol.MAX_HEARTBEAT_ACKS)); }
    /** Drops only the acknowledged outcomes, retaining any newer outcome produced while the heartbeat was in flight. */
    public async acknowledge(sent: readonly HeartbeatAck[]): Promise<void> { if (sent.length) await this.mutate(state => { state.acks = state.acks.filter(entry => !sent.some(ack => ack.id === entry.id && ack.outcome === entry.outcome)); }); }

    /** Pending invitations, without their secret digests. */
    public invites(): readonly Omit<StoredInvite, 'secretDigest'>[] { return this.state.invites.filter(invite => Date.parse(invite.expiresAt) > Date.now()).map(({ secretDigest: _secret, ...invite }) => invite); }
    /** Creates a 512-bit single-use invite understood by the existing join page, returning its secret once. */
    public async createInvite(input: { readonly role: Role; readonly expiresAt: string; readonly createdBy: string }, actor?: Actor): Promise<{ invite: Omit<StoredInvite, 'secretDigest'>; secret: string }> {
        return await this.authorized(actor, 'members.manage', 'invite.create', undefined, undefined, state => {
            if (!(Date.parse(input.expiresAt) > Date.now())) throw new PtbkError('The invitation expiry must be in the future.', { kind: 'usage' });
            const secret = `invite.${encodeBase64Url(randomBytes(64))}`;
            const invite = { id: newOpaqueId(), ...input, createdAt: new Date().toISOString() };
            state.invites.push({ ...invite, secretDigest: digest(secret) }); this.auditIn(state, 'invite.create', actor, 'invite', invite.id);
            return { invite, secret };
        });
    }
    /** Checks an invitation without consuming it, so a cancelled passkey prompt can be retried. */
    public inviteValid(secret: string): boolean { return /^invite\.[A-Za-z0-9_-]{86}$/.test(secret) && this.state.invites.some(invite => Date.parse(invite.expiresAt) > Date.now() && digestsEqual(invite.secretDigest, digest(secret))); }
    /** Revokes an unconsumed invitation. */
    public async revokeInvite(id: string, actor?: Actor): Promise<boolean> { return await this.authorized(actor, 'members.manage', 'invite.revoke', 'invite', id, state => { const before = state.invites.length; state.invites = state.invites.filter(invite => invite.id !== id); if (before === state.invites.length) return false; this.auditIn(state, 'invite.revoke', actor, 'invite', id); return true; }, false); }
    /** The member manager preapproved an invite's role; verified registration atomically consumes that grant. */
    public async acceptInvite(secret: string, credential: NewPasskey): Promise<{ kind: 'invalid' } | { kind: 'approved'; member: StoredMember; request: string }> {
        return await this.mutate(state => {
            const invite = state.invites.find(item => digestsEqual(item.secretDigest, digest(secret)));
            if (!invite || !this.hasOwner || this.credentialExists(state, credential.credentialId)) return { kind: 'invalid' };
            const member = this.addMemberTo(state, { displayName: 'Invited member', role: invite.role }); const key = this.storePasskey(state, member.id, credential); const request = newOpaqueId();
            state.invites = state.invites.filter(item => item.id !== invite.id);
            state.joining.push({ request: { id: newOpaqueId(), displayName: member.displayName, email: 'invite@engine.invalid', proposedRole: 'member', createdAt: member.createdAt, expiresAt: new Date(Date.now() + api.ACCESS_REQUEST_TTL_MS).toISOString() }, ticketId: null, dashboardUserId: null, codeDigest: '', pollDigest: digest(request), attempts: 0, state: 'approved', memberId: member.id, passkeyId: key.id });
            this.auditIn(state, 'passkey.register', undefined, 'passkey', key.id); return { kind: 'approved', member, request };
        });
    }

    /** Adds a content-free hash-chained audit record to the same transaction as the access change. */
    private auditIn(state: AccessState, action: string, actor?: Actor, kind?: string, id?: string, outcome: AccessAudit['outcome'] = 'success', code?: string): void {
        const previous = state.audit.at(-1);
        const entry: Omit<AccessAudit, 'hash'> = { id: newOpaqueId(), seq: (previous?.seq ?? 0) + 1, at: new Date().toISOString(), actor: actor ? { kind: 'member', memberId: actor.memberId } : { kind: 'system' }, action, target: kind && id ? { kind, id, name: null } : null, outcome, client: actor?.client ?? null, prevHash: previous?.hash ?? null, details: code ? { code } : null };
        const hash = digest(JSON.stringify([entry.id, entry.seq, entry.at, entry.actor, entry.action, entry.target, entry.outcome, entry.client, entry.prevHash, entry.details]));
        state.audit.push({ ...entry, hash });
    }
    /** Records a denied API operation or a chat retry without storing its body or credentials. */
    public async recordAudit(action: string, actor: Actor, kind?: string, id?: string, outcome: AccessAudit['outcome'] = 'success', code?: string): Promise<void> { await this.mutate(state => this.auditIn(state, action, actor, kind, id, outcome, code)); }
}
