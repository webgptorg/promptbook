import type { ChildProcess } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomicSync } from '../common/fs.js';
import { isProcessAlive, killVerifiedProcess, observeSpawnedProcesses, processGroupAlive, verifyRecordedProcess } from '../common/process.js';
import type { Project } from '../project/workspace.js';

/**
 * One execution process an engine started: a harness, check, Git or helper command, an engine-owned browser or the
 * other execution helpers.
 *
 * @private owned processes
 */
export type OwnedProcess = {
    readonly pid: number;
    /** It leads its own process group (POSIX), so terminating the group reaches its descendants. */
    readonly group: boolean;
    readonly label: string;
    /** When it was spawned (ISO); a live PID that started later is a reused PID, never this process. */
    readonly startedAt: string;
};

/**
 * Ledger of an engine's live owned processes (`.ptbk/service/owned.json`, owner-readable), so a force stop can end every
 * owned worker even when the engine itself is unresponsive or has to be killed.
 *
 * @private owned processes
 */
export type OwnedLedger = {
    readonly version: 1;
    readonly instanceId: string;
    readonly enginePid: number;
    readonly processes: readonly OwnedProcess[];
    readonly savedAt: string;
};

/**
 * Path of the ledger.
 */
function ledgerPath(project: Project): string {
    return join(project.runtime.service, 'owned.json');
}

/**
 * Coalescing delay of ledger rewrites after a process exited (a new process is recorded at once).
 */
const REMOVAL_WRITE_DELAY_MS = 1000;

/**
 * The engine-side recorder: every child spawned through the shared helpers is recorded before the spawn call returns
 * and removed when it exits. Only one engine host per process records at a time.
 *
 * @private owned processes
 */
export class OwnedProcessRecorder {
    private readonly live = new Map<number, { readonly entry: OwnedProcess; readonly child: ChildProcess }>();
    private pendingWrite?: NodeJS.Timeout;

    public constructor(
        private readonly project: Project,
        private readonly instanceId: string,
    ) {}

    /** Starts recording spawned processes of this process. */
    public start(): void {
        observeSpawnedProcesses((child, info) => {
            const pid = child.pid!;
            this.live.set(pid, { entry: { pid, group: info.group, label: info.label, startedAt: new Date().toISOString() }, child });
            this.write();
            child.once('exit', () => {
                this.live.delete(pid);
                this.scheduleWrite();
            });
        });
    }

    /** Owned processes that are still running. */
    public processes(): OwnedProcess[] {
        return [...this.live.values()].map(({ entry }) => entry);
    }

    /**
     * Force stop: kills every owned process still running after `graceMs` (their whole group/tree), so no owned worker
     * outlives the engine. Graceful shutdown never calls it.
     */
    public async terminateRemaining(graceMs: number): Promise<void> {
        const deadline = Date.now() + graceMs;
        while (this.live.size && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
        await Promise.all(
            [...this.live.values()].map(async ({ entry, child }) => {
                if (child.exitCode !== null || child.signalCode !== null) return;
                await killVerifiedProcess(entry.pid, { group: entry.group });
            }),
        );
    }

    /** Stops recording and removes this engine's ledger (never a successor's). */
    public stop(): void {
        observeSpawnedProcesses(undefined);
        clearTimeout(this.pendingWrite);
        try {
            const current = JSON.parse(readFileSync(ledgerPath(this.project), 'utf8')) as Partial<OwnedLedger>;
            if (current.instanceId === this.instanceId) rmSync(ledgerPath(this.project), { force: true });
        } catch {
            // no ledger
        }
    }

    /** Writes the ledger now (a newly spawned process must be recorded before anything can kill the engine). */
    private write(): void {
        clearTimeout(this.pendingWrite);
        this.pendingWrite = undefined;
        const ledger: OwnedLedger = { version: 1, instanceId: this.instanceId, enginePid: process.pid, processes: this.processes(), savedAt: new Date().toISOString() };
        try {
            writeFileAtomicSync(ledgerPath(this.project), `${JSON.stringify(ledger, null, 4)}\n`, { mode: 0o600 });
        } catch {
            // Best-effort: the engine's own force stop still ends its children.
        }
    }

    /** Coalesces rewrites after exits (a stale entry is harmless: termination verifies every PID). */
    private scheduleWrite(): void {
        if (this.pendingWrite) return;
        this.pendingWrite = setTimeout(() => this.write(), REMOVAL_WRITE_DELAY_MS);
        this.pendingWrite.unref();
    }
}

/**
 * Reads an engine's ledger (undefined when absent or unreadable).
 *
 * @private owned processes
 */
export function readOwnedLedger(project: Project): OwnedLedger | undefined {
    try {
        const ledger = JSON.parse(readFileSync(ledgerPath(project), 'utf8')) as OwnedLedger;
        return ledger?.version === 1 && Array.isArray(ledger.processes) ? ledger : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Outcome of terminating the recorded owned processes of one engine instance.
 *
 * @private owned processes
 */
export type OwnedTermination = { readonly terminated: number; readonly unverified: readonly OwnedProcess[]; readonly remaining: readonly OwnedProcess[] };

/**
 * Terminates the recorded owned processes of one engine instance from outside it (after that engine ended or had to be
 * killed). Each PID is verified against its recorded spawn time first; a process group whose leader already exited is
 * still the recorded group while it exists. A successor's ledger (another instance) is never used, and the ledger is
 * left for its owner's successor to replace.
 *
 * @private owned processes
 */
export async function terminateOwnedProcesses(project: Project, instanceId: string): Promise<OwnedTermination> {
    const ledger = readOwnedLedger(project);
    if (!ledger || ledger.instanceId !== instanceId) return { terminated: 0, unverified: [], remaining: [] };
    const killed: OwnedProcess[] = [];
    const unverified: OwnedProcess[] = [];
    await Promise.all(
        ledger.processes.map(async (owned) => {
            const identity = await verifyRecordedProcess(owned.pid, owned.startedAt);
            if (identity === 'verified') {
                await killVerifiedProcess(owned.pid, { group: owned.group });
                killed.push(owned);
            } else if (identity === 'gone' && owned.group && processGroupAlive(owned.pid)) {
                await killVerifiedProcess(owned.pid, { group: true });
                killed.push(owned);
            } else if (identity === 'unknown') unverified.push(owned);
            // `reused`: the PID now belongs to an unrelated process, which is never touched.
        }),
    );
    if (killed.length) await new Promise((resolve) => setTimeout(resolve, 300));
    const remaining = killed.filter((owned) => (owned.group ? processGroupAlive(owned.pid) : isProcessAlive(owned.pid)));
    return { terminated: killed.length - remaining.length, unverified, remaining };
}
