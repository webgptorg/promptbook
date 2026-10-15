import { createHash, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { secretToken, shortId } from '../common/ids.js';
import type { Project } from '../project/workspace.js';

/**
 * Lifetime of a pairing capability.
 *
 * @private remote access authentication
 */
export const PAIRING_TTL_MS = 10 * 60_000;

/**
 * Lifetime of a paired device session.
 *
 * @private remote access authentication
 */
export const SESSION_TTL_MS = 30 * 86_400_000;

/**
 * Stored pairing capability (secret kept owner-readable so the trusted local terminal can display it).
 */
type PairingRecord = { readonly code: string; readonly createdAt: number; readonly expiresAt: number; readonly consumedAt?: number };

/**
 * Stored device session.
 *
 * @private remote access authentication
 */
export type SessionRecord = {
    readonly id: string;
    readonly tokenHash: string;
    readonly csrf: string;
    readonly label: string;
    readonly createdAt: number;
    readonly lastSeenAt: number;
    readonly expiresAt: number;
    readonly revokedAt?: number;
};

/**
 * Stored API token.
 *
 * @private remote access authentication
 */
export type ApiTokenRecord = { readonly id: string; readonly tokenHash: string; readonly label: string; readonly createdAt: number; readonly revokedAt?: number };

/**
 * Hash used for stored credentials.
 */
function hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

/**
 * Constant-time comparison of hex hashes.
 */
function sameHash(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Project-scoped pairing, session and API-token store in `.ptbk/auth/`.
 *
 * @private remote access authentication
 */
export class AuthStore {
    private readonly directory: string;
    private failedPairings: number[] = [];

    public constructor(project: Project) {
        this.directory = project.runtime.auth;
    }

    /** Path of a store file. */
    private file(name: string): string {
        return join(this.directory, name);
    }

    /** Writes a store file owner-readable only. */
    private async write(name: string, value: unknown): Promise<void> {
        await ensureDirectory(this.directory);
        await writeJsonAtomic(this.file(name), value, { mode: 0o600 });
    }

    /** Current pairing capability if unused and unexpired (no side effects). */
    public async currentPairing(): Promise<{ code: string; expiresAt: number } | undefined> {
        const pairing = await readJsonIfExists<PairingRecord>(this.file('pairing.json')).catch(() => undefined);
        if (!pairing || pairing.consumedAt || pairing.expiresAt <= Date.now()) return undefined;
        return { code: pairing.code, expiresAt: pairing.expiresAt };
    }

    /** Creates a fresh pairing capability, invalidating the previous one (explicit trusted local action). */
    public async renewPairing(): Promise<{ code: string; expiresAt: number }> {
        const now = Date.now();
        const record: PairingRecord = { code: secretToken(24), createdAt: now, expiresAt: now + PAIRING_TTL_MS };
        await this.write('pairing.json', record);
        return { code: record.code, expiresAt: record.expiresAt };
    }

    /**
     * Redeems a pairing capability once, creating an authenticated device session.
     *
     * Failed attempts are rate-limited.
     */
    public async redeemPairing(code: string, label: string): Promise<{ token: string; session: SessionRecord } | { error: string }> {
        const now = Date.now();
        this.failedPairings = this.failedPairings.filter((time) => now - time < 60_000);
        if (this.failedPairings.length >= 10) return { error: 'Too many pairing attempts; wait a minute.' };
        const pairing = await readJsonIfExists<PairingRecord>(this.file('pairing.json')).catch(() => undefined);
        const valid = pairing && !pairing.consumedAt && pairing.expiresAt > now && typeof code === 'string' && code.length === pairing.code.length && sameHash(hash(code), hash(pairing.code));
        if (!valid) {
            this.failedPairings.push(now);
            return { error: pairing?.consumedAt ? 'This pairing link was already used. Renew pairing in the local terminal.' : 'The pairing link is invalid or expired. Renew pairing in the local terminal.' };
        }
        await this.write('pairing.json', { ...pairing, consumedAt: now });
        const token = secretToken(32);
        const session: SessionRecord = { id: `d-${shortId(6)}`, tokenHash: hash(token), csrf: secretToken(18), label: label.slice(0, 120) || 'browser', createdAt: now, lastSeenAt: now, expiresAt: now + SESSION_TTL_MS };
        const sessions = await this.sessions();
        await this.write('sessions.json', [...sessions.filter((item) => !item.revokedAt && item.expiresAt > now), session]);
        return { token, session };
    }

    /** All stored sessions. */
    public async sessions(): Promise<SessionRecord[]> {
        return (await readJsonIfExists<SessionRecord[]>(this.file('sessions.json')).catch(() => undefined)) ?? [];
    }

    /** Authenticates a session token. */
    public async authenticateSession(token: string | undefined): Promise<SessionRecord | undefined> {
        if (!token) return undefined;
        const digest = hash(token);
        const now = Date.now();
        return (await this.sessions()).find((session) => !session.revokedAt && session.expiresAt > now && sameHash(session.tokenHash, digest));
    }

    /** Revokes one session or all sessions. */
    public async revokeSessions(id: string | 'all'): Promise<number> {
        const now = Date.now();
        let count = 0;
        const sessions = (await this.sessions()).map((session) => {
            if (!session.revokedAt && (id === 'all' || session.id === id)) {
                count++;
                return { ...session, revokedAt: now };
            }
            return session;
        });
        await this.write('sessions.json', sessions);
        return count;
    }

    /** Stored API tokens. */
    public async apiTokens(): Promise<ApiTokenRecord[]> {
        return (await readJsonIfExists<ApiTokenRecord[]>(this.file('tokens.json')).catch(() => undefined)) ?? [];
    }

    /** Issues a project-scoped API token (shown once). */
    public async createApiToken(label: string): Promise<{ id: string; token: string }> {
        const token = `ptbk_${secretToken(32)}`;
        const record: ApiTokenRecord = { id: `t-${shortId(6)}`, tokenHash: hash(token), label: label || 'api client', createdAt: Date.now() };
        await this.write('tokens.json', [...(await this.apiTokens()), record]);
        return { id: record.id, token };
    }

    /** Revokes an API token. */
    public async revokeApiToken(id: string): Promise<boolean> {
        let found = false;
        const tokens = (await this.apiTokens()).map((token) => {
            if (token.id === id && !token.revokedAt) {
                found = true;
                return { ...token, revokedAt: Date.now() };
            }
            return token;
        });
        await this.write('tokens.json', tokens);
        return found;
    }

    /** Authenticates a bearer API token. */
    public async authenticateApiToken(token: string | undefined): Promise<ApiTokenRecord | undefined> {
        if (!token) return undefined;
        const digest = hash(token);
        return (await this.apiTokens()).find((record) => !record.revokedAt && sameHash(record.tokenHash, digest));
    }
}
