import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { HarnessOperationResult } from './contract.js';

/** Global installation coordination options, shared by every Promptbook project. @private */
export interface HarnessLockOptions { signal?: AbortSignal; lockPath?: string; waitMs?: number; }

/** Durable owner identity; ambiguous or foreign ownership is never reclaimed automatically. */
interface Owner { token: string; pid: number; host: string; startedAt: number; }

/** Resolve current-user global state, independently of project paths and configuration. @private */
export function harnessStateDirectory(options: HarnessLockOptions = {}): string {
    return options.lockPath || join(homedir(), '.cache', 'promptbook', 'harnesses');
}

/** Restrict filesystem identities to registered stable integration identifiers. */
function harnessDirectory(name: string, options: HarnessLockOptions): string {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Invalid harness lock identity.');
    return join(harnessStateDirectory(options), name);
}

/** Validate private ownership before coordinating globally installed executable replacements. */
async function privateDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true, mode: 0o700 });
    const value = await lstat(path);
    if (!value.isDirectory() || value.isSymbolicLink() || process.platform !== 'win32' && (value.mode & 0o077) !== 0 || process.getuid && value.uid !== process.getuid()) throw new Error(`Harness state must be an ordinary current-user directory: ${path}`);
}

/** A PID is stale only after the operating system proves it no longer exists. */
function alive(owner: Owner): boolean {
    if (owner.host !== hostname() || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) return true;
    try { process.kill(owner.pid, 0); return true; }
    catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}

/** Read bounded ownership without exposing user credentials or trusting malformed state. */
async function readOwner(path: string): Promise<Owner | undefined> {
    try {
        const text = await readFile(path, 'utf8');
        if (text.length > 8192) return undefined;
        const owner = JSON.parse(text) as Owner;
        return owner && typeof owner.token === 'string' && typeof owner.host === 'string' && typeof owner.startedAt === 'number' && Number.isSafeInteger(owner.pid) ? owner : undefined;
    } catch { return undefined; }
}

/** Serialize short registration transactions and hold the same gate throughout global replacement. */
async function gate(name: string, options: HarnessLockOptions, wait: boolean): Promise<(() => Promise<void>) | undefined> {
    const directory = harnessDirectory(name, options);
    await privateDirectory(directory);
    const path = join(directory, 'gate');
    const owner: Owner = { token: randomUUID(), pid: process.pid, host: hostname(), startedAt: Date.now() };
    const deadline = Date.now() + (options.waitMs ?? 10_000);
    for (;;) {
        if (options.signal?.aborted) throw new Error('Harness coordination cancelled.');
        try {
            await mkdir(path, { mode: 0o700 });
            await writeFile(join(path, 'owner.json'), JSON.stringify(owner), { mode: 0o600, flag: 'wx' });
            return async () => {
                if ((await readOwner(join(path, 'owner.json')))?.token === owner.token) await rm(path, { recursive: true, force: true });
            };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            // A dead Promptbook process may have left a detached provider or installer
            // running. Preserve abandoned gates until invocation completion is verified;
            // PID death alone is not authorization to replace the shared installation.
            if (!wait || Date.now() >= deadline) return undefined;
            await delay(Math.min(100, Math.max(1, deadline - Date.now())), undefined, { signal: options.signal });
        }
    }
}

/** Register active usage before startup; concurrent users coexist, updates wait for all of them. @private */
export async function acquireHarnessUsage(name: string, options: HarnessLockOptions = {}): Promise<() => Promise<void>> {
    const releaseGate = await gate(name, options, true);
    if (!releaseGate) throw new Error(`${name} global installation is undergoing maintenance or has an unresolved lock. Try again after the active update finishes.`);
    const token = randomUUID();
    const path = join(harnessDirectory(name, options), `usage-${token}.json`);
    try { await writeFile(path, JSON.stringify({ token, pid: process.pid, host: hostname(), startedAt: Date.now() } satisfies Owner), { mode: 0o600, flag: 'wx' }); }
    finally { await releaseGate(); }
    return async () => { if ((await readOwner(path))?.token === token) await rm(path, { force: true }); };
}

/** Replace a global installation only when no Promptbook invocation in any project uses it. @private */
export async function withHarnessUpdate(name: string, action: () => Promise<HarnessOperationResult>, options: HarnessLockOptions = {}): Promise<HarnessOperationResult> {
    let releaseGate: (() => Promise<void>) | undefined;
    try {
        releaseGate = await gate(name, options, false);
        if (!releaseGate) return { name, outcome: 'deferred', diagnostic: 'Global maintenance is active or has an unresolved ownership gate; update deferred. Verify the owning installer finished before cleaning abandoned global harness state.' };
        const { readdir } = await import('node:fs/promises');
        const directory = harnessDirectory(name, options);
        for (const filename of await readdir(directory)) {
            if (!/^usage-[\w-]+\.json$/.test(filename)) continue;
            const path = join(directory, filename); const owner = await readOwner(path);
            if (!owner || alive(owner)) return { name, outcome: 'deferred', diagnostic: 'The shared global installation is in use by an active or unverified Promptbook invocation; update deferred to a safe boundary.' };
            return { name, outcome: 'deferred', diagnostic: `A previous invocation owner exited without releasing ${path}; its detached provider may still be running. Verify invocation completion before removing the preserved lease and retrying the global update.` };
        }
        if (options.signal?.aborted) return { name, outcome: 'cancelled', diagnostic: 'Global update cancelled before replacement.' };
        return await action();
    } catch (error) {
        return { name, outcome: options.signal?.aborted ? 'cancelled' : 'failed', diagnostic: `Global installation maintenance failed: ${(error as Error).message}` };
    } finally { await releaseGate?.(); }
}
