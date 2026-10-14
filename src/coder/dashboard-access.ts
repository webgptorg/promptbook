import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { chmod, lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Workspace } from './domain.js';
import { atomicWrite } from './state.js';
import { confinePath, InputError } from './workspace.js';

/** A persisted project credential grants only the existing dashboard capabilities. */
interface DeviceCredential { id: string; hash: string; kind: 'device' | 'api'; expiresAt: number; createdAt: number; revoked?: boolean; origin?: string }
/** Sensitive access state is confined to a private ignored file, never ordinary runtime telemetry. */
interface AccessState { version: 1; project: string; identity: string; pairing?: { capability: string; expiresAt: number; consumed?: boolean }; credentials: DeviceCredential[] }
/** Hash capabilities before retaining device credentials or comparing user input. */
function digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }
/** Compare fixed-size hashes without revealing how much of a credential matched. */
function equal(actual: string, expected: string): boolean { return timingSafeEqual(Buffer.from(digest(actual), 'hex'), Buffer.from(expected, 'hex')); }
/** Create cryptographically unpredictable URL-fragment capabilities. */
function capability(): string { return randomBytes(32).toString('base64url'); }

/** Project-scoped single-use pairing and expiring, revocable browser/API sessions. @private */
export class DashboardAccess {
    private constructor(private readonly path: string, private readonly state: AccessState, private readonly now: () => number) {}
    /** Initialize protection before any tunnel is started; corrupt state fails closed. */
    static async open(workspace: Workspace, now: () => number = Date.now): Promise<DashboardAccess> {
        const path = await confinePath(workspace.projectPath, join(workspace.statePath, 'access.json'));
        let state: AccessState;
        try {
            const attributes = await lstat(path);
            if (!attributes.isFile() || process.getuid && (attributes.uid !== process.getuid() || attributes.mode & 0o077)) throw new InputError('Dashboard access state must be a private current-user file.');
            state = JSON.parse(await readFile(path, 'utf8')) as AccessState;
            if (state.version !== 1 || state.project !== workspace.projectPath || !state.identity || !Array.isArray(state.credentials) || state.credentials.some(entry => !/^[a-f0-9]{64}$/.test(entry.hash) || !Number.isFinite(entry.expiresAt)) || state.pairing && (!/^[A-Za-z0-9_-]{43}$/.test(state.pairing.capability) || !Number.isFinite(state.pairing.expiresAt))) throw new InputError('Invalid dashboard access state; preserved for investigation.');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            state = { version: 1, project: workspace.projectPath, identity: randomUUID(), credentials: [] };
        }
        const access = new DashboardAccess(path, state, now);
        // Startup may prepare the first link, but inspection never rotates an existing capability.
        if (!state.pairing) await access.renew();
        return access;
    }
    /** Serialize credential changes so concurrent redemption cannot use one capability twice. */
    private pending: Promise<unknown> = Promise.resolve();
    /** Persist private state before acknowledging any grant or revocation. */
    private mutate<T>(operation: () => T): Promise<T> {
        const pending = this.pending.then(async () => {
            const previous = structuredClone(this.state);
            try { const result = operation(); await atomicWrite(this.path, this.state); await chmod(this.path, 0o600); return result; }
            catch (error) { Object.assign(this.state, previous); throw error; }
        });
        this.pending = pending.catch(() => {}); return pending;
    }
    /** Return only availability and expiry, safe for ordinary authenticated status. */
    status(): { status: 'available' | 'consumed' | 'expired'; expiresAt?: number } {
        const pair = this.state.pairing;
        return { status: pair?.consumed ? 'consumed' : !pair || pair.expiresAt <= this.now() ? 'expired' : 'available', expiresAt: pair?.expiresAt };
    }
    /** Distinct cookie names keep multiple loopback projects usable in the same browser profile. */
    cookieName(): string { return `ptbk-device-${digest(this.state.identity).slice(0, 24)}`; }
    /** Expose an existing sensitive link only to a trusted local control client. */
    link(origin: string): string | undefined { return this.status().status === 'available' ? `${origin}/#pair=${this.state.pairing!.capability}` : undefined; }
    /** Explicit local renewal replaces the previous short-lived capability. */
    renew(): Promise<ReturnType<DashboardAccess['status']>> {
        return this.mutate(() => { this.state.pairing = { capability: capability(), expiresAt: this.now() + 10 * 60_000 }; return this.status(); });
    }
    /** Redeem once into a cookie session; no provider-specific browser login is required. */
    redeem(value: unknown, origin?: string): Promise<{ token: string; expiresAt: number }> {
        return this.mutate(() => {
            if (typeof value !== 'string' || value.length > 128 || this.status().status !== 'available' || !equal(value, digest(this.state.pairing!.capability))) throw new InputError('Pairing link is invalid, expired or already consumed. Renew it from the trusted local terminal.');
            this.state.pairing!.consumed = true;
            return this.issue('device', origin);
        });
    }
    /** Issue an explicit direct-client credential from local controls only. */
    issueApi(): Promise<{ token: string; expiresAt: number }> { return this.mutate(() => this.issue('api')); }
    /** Bound retained credentials and create a fresh project-scoped grant. */
    private issue(kind: DeviceCredential['kind'], origin?: string): { token: string; expiresAt: number } {
        this.state.credentials = this.state.credentials.filter(entry => !entry.revoked && entry.expiresAt > this.now());
        if (this.state.credentials.length >= 100) throw new InputError('Device/API credential limit reached; revoke unused access locally.');
        const token = capability(); const expiresAt = this.now() + 7 * 24 * 60 * 60_000;
        this.state.credentials.push({ id: randomUUID(), hash: digest(token), kind, expiresAt, createdAt: this.now(), ...(origin ? { origin } : {}) });
        return { token, expiresAt };
    }
    /** Check a session or explicit API bearer without trusting proxy headers or loopback appearance. */
    authenticate(value: unknown, kind: DeviceCredential['kind'], origin?: string): boolean {
        return typeof value === 'string' && value.length <= 128 && this.state.credentials.some(entry => entry.kind === kind && (!entry.origin || entry.origin === origin) && !entry.revoked && entry.expiresAt > this.now() && equal(value, entry.hash));
    }
    /** Local inspection reveals revocable identifiers, never credential bytes. */
    devices(): Array<Omit<DeviceCredential, 'hash'>> { return this.state.credentials.map(({ hash: _hash, ...entry }) => entry); }
    /** Explicit local-only startup removes authority from previously paired public-origin sessions. */
    revokeRemoteDevices(): Promise<void> { return this.mutate(() => { for (const entry of this.state.credentials) if (entry.kind === 'device' && entry.origin?.startsWith('https:')) entry.revoked = true; }); }
    /** Revoke a selected device/API grant or all access, including unused pairing. */
    revoke(id?: string): Promise<void> {
        return this.mutate(() => {
            if (id && !this.state.credentials.some(entry => entry.id === id)) throw new InputError('Unknown paired device/API credential.');
            for (const entry of this.state.credentials) if (!id || entry.id === id) entry.revoked = true;
            if (!id && this.state.pairing) this.state.pairing.consumed = true;
        });
    }
}
