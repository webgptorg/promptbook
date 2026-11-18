import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promptbookAppData } from '../common/app-data.js';
import { readJsonIfExists, writeFileAtomic } from '../common/fs.js';
import { isProcessAlive } from '../common/process.js';

/** Shared per-user desktop coordination directory, outside project/Git storage. @private computer control */
export function computerDirectory(env: NodeJS.ProcessEnv = process.env): string {
    return join(promptbookAppData(env), 'computer-control');
}

/** One unique Lamport bakery participant; filenames are never reused or removed by a live peer. */
type OperationTicket = { readonly pid: number; readonly choosing: boolean; readonly number: number };

/** Windows can briefly deny opening a ticket while its owner atomically replaces or removes it. */
const TRANSIENT_TICKET_READ_ERRORS = new Set(['EPERM', 'EACCES', 'EBUSY']);

/** Bound sharing retries; persistent unreadability never grants desktop ownership. */
const TICKET_READ_ATTEMPTS = 8;

/**
 * Runs one short operation exclusively across engines using Lamport's bakery algorithm. Unique atomic tickets
 * avoid reclaiming a shared lock pathname: two recoverers can never delete a newly-created live owner's lock.
 * Only a demonstrably dead participant's uniquely named ticket is reaped; live/stalled owners time out safely.
 * @private computer control
 */
export async function desktopExclusive<T>(env: NodeJS.ProcessEnv, action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const directory = join(computerDirectory(env), 'operations');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const id = `${process.pid}-${randomBytes(16).toString('hex')}.json`;
    const file = join(directory, id);
    const deadline = Date.now() + 30_000;
    const read = async (name: string): Promise<OperationTicket | undefined> => {
        let record: OperationTicket | undefined;
        for (let attempt = 1; ; attempt++) {
            signal?.throwIfAborted();
            try {
                record = await readJsonIfExists<OperationTicket>(join(directory, name));
                break;
            } catch (error) {
                // A sharing failure is an unknown live owner, not an absent ticket. Stay outside the critical
                // section until a real read/ENOENT succeeds; exhausted retries preserve the original error.
                if (!TRANSIENT_TICKET_READ_ERRORS.has((error as NodeJS.ErrnoException).code ?? '') || attempt >= TICKET_READ_ATTEMPTS) throw error;
                await delay(25, undefined, { signal });
            }
        }
        if (!record) return undefined;
        if (!Number.isInteger(record.pid) || !Number.isSafeInteger(record.number) || typeof record.choosing !== 'boolean') throw new Error('Desktop operation ownership is unreadable.');
        if (!isProcessAlive(record.pid)) {
            await rm(join(directory, name), { force: true });
            return undefined;
        }
        return record;
    };
    await writeFileAtomic(file, JSON.stringify({ pid: process.pid, choosing: true, number: 0 }), { mode: 0o600 });
    try {
        let number = 0;
        for (const name of await readdir(directory)) {
            if (!name.endsWith('.json')) continue;
            number = Math.max(number, (await read(name))?.number ?? 0);
        }
        number++;
        if (!Number.isSafeInteger(number)) throw new Error('Desktop operation queue is exhausted.');
        await writeFileAtomic(file, JSON.stringify({ pid: process.pid, choosing: false, number }), { mode: 0o600 });
        for (;;) {
            signal?.throwIfAborted();
            let blocked = false;
            for (const name of await readdir(directory)) {
                if (!name.endsWith('.json') || name === id) continue;
                const other = await read(name);
                if (other && (other.choosing || other.number < number || other.number === number && name < id)) { blocked = true; break; }
            }
            if (!blocked) break;
            if (Date.now() > deadline) throw new Error('Another desktop operation is still running. Reconcile uncertain input before retrying.');
            await delay(25, undefined, { signal });
        }
        signal?.throwIfAborted();
        return await action();
    } finally {
        await rm(file, { force: true });
    }
}

/** Record of a temporary protected desktop interval. No secret values are stored. @private computer control */
type ProtectionRecord = { readonly pid: number; readonly reason: string };

/**
 * Blocks desktop observation/input before Wallet values are entered, until they have been cleared.
 * Acquiring the same short lock as desktop inputs closes the check/entry race across engines.
 * @private computer control
 */
export async function protectDesktop(env: NodeJS.ProcessEnv, reason: string): Promise<() => Promise<void>> {
    const directory = join(computerDirectory(env), 'protected');
    const file = join(directory, `${process.pid}-${randomBytes(12).toString('hex')}.json`);
    await desktopExclusive(env, async () => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(file, JSON.stringify({ pid: process.pid, reason } satisfies ProtectionRecord), { mode: 0o600 });
    });
    return async () => { await rm(file, { force: true }); };
}

/** Reads directory entries; unexpected access failures remain failures rather than permission to capture. */
async function entries(directory: string): Promise<string[]> {
    return await readdir(directory).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
}

/**
 * A whole-screen tool cannot bypass a protected Wallet interval or any manually reserved browser tab,
 * including a reservation held by another project. Dead-engine markers are discarded.
 * @private computer control
 */
export async function desktopProtectionReason(env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
    const directory = join(computerDirectory(env), 'protected');
    for (const name of await entries(directory)) {
        if (!name.endsWith('.json')) continue;
        const file = join(directory, name);
        const record = await readJsonIfExists<ProtectionRecord>(file);
        if (!record) continue;
        if (!Number.isInteger(record.pid) || record.pid <= 0 || typeof record.reason !== 'string' || !record.reason) throw new Error('Desktop protection state is unreadable; capture remains blocked.');
        if (isProcessAlive(record.pid)) return record.reason;
        await rm(file, { force: true });
    }
    const tabs = join(promptbookAppData(env), 'browser-pools', 'tabs');
    for (const profile of await entries(tabs)) {
        for (const name of await entries(join(tabs, profile))) {
            if (!name.startsWith('tab-') || !name.endsWith('.json')) continue;
            const file = join(tabs, profile, name);
            const reservation = await readJsonIfExists<{ pid: number }>(file);
            if (reservation && (!Number.isInteger(reservation.pid) || reservation.pid <= 0)) throw new Error('Browser takeover state is unreadable; capture remains blocked.');
            if (reservation && isProcessAlive(reservation.pid)) return 'A browser tab is under protected human control. Return that tab before using Computer Control.';
        }
    }
    return undefined;
}
