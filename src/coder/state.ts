import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TaskDefinition, Workspace } from './domain.js';
import { git, type GitIdentity, type GitSnapshot } from './git.js';
import { confinePath } from './workspace.js';

/** Durable result of one occurrence; the ledger is bounded independently from traces. @private */
export interface OccurrenceHistory {
    id: string; slot: number; startedAt: number; finishedAt?: number; outcome: string;
    attempts: number; commits: string[]; trace?: string; coalesced?: number;
}
/** Scheduling state keyed by a task's stable ID. @private */
export interface LedgerEntry {
    scheduleRevision: string; anchor?: number; lastConsumedSlot?: number; lastCompletedSlot?: number;
    timezone?: string; afterRaw?: string;
    nextDue?: number; blocked?: string; claim?: { id: string; runId: string; slot: number; startedAt: number };
    history: OccurrenceHistory[];
}
/** Versioned state refuses malformed content rather than silently discarding history. @private */
export interface Ledger { version: 1; tasks: Record<string, LedgerEntry> }
/** One chronological provider call, including the reason for a bounded technical retry. @private */
export interface AttemptRecord {
    attempt: number; retry: number; startedAt: number; finishedAt?: number; outcome?: string; exitCode?: number | null;
    reason?: string; retryReason?: string; cooldownMs?: number; sessionId?: string; usage?: Record<string, number>;
    harness?: string; model?: string; agent?: string; thinkingLevel?: string; authentication?: string; effectiveModel?: string;
}
/** Recoverable phase boundaries contain exact ownership evidence and commit intents. @private */
export interface RunJournal {
    version: 1; id: string; taskId: string; occurrenceId: string; task: TaskDefinition;
    phase: 'claimed' | 'running' | 'implementation-ready' | 'checking' | 'completion-ready' | 'completed' | 'recovery-required' | 'failed';
    startedAt: number; updatedAt: number; dueSlot: number; baseline: GitSnapshot;
    expected?: GitSnapshot; protectedPaths: string[]; commits: string[]; attempts: number;
    harness?: string; model?: string; output?: string; checkCommand?: string; error?: string;
    pendingPhase?: string; syncPending?: boolean; checks?: string; trace?: string;
    thinkingLevel?: string; authentication?: string; effectiveModel?: string; usage?: Record<string, number>; sessionId?: string; identity?: GitIdentity;
    legacyTrace?: string; legacyTraceHash?: string;
    agent?: string; agentInstructionsHash?: string;
    sourceSnapshot?: { revision: string; payloadHash: string; gitHead: string | null };
    attemptHistory?: AttemptRecord[];
}
/** Exclusive mutation ownership shared by nested projects and related Git worktrees. @private */
export interface WorkspaceLease { token: string; path: string; assertOwned(): Promise<void>; release(): Promise<void> }
/** Keep all owned operational state in the configured project directory. @private */
export function stateDirectory(workspace: Workspace): string { return workspace.statePath; }
/** Write a complete state file atomically; a crash leaves the previous complete revision. @private */
export async function atomicWrite(filename: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
        const handle = await fs.open(temporary, 'wx', 0o600);
        try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`); await handle.sync(); } finally { await handle.close(); }
        await fs.rename(temporary, filename);
    } finally { await fs.rm(temporary, { force: true }); }
}
/** Read a required versioned object and distinguish absent state from corruption. @private */
async function readState<T>(filename: string): Promise<T | undefined> {
    try {
        const object = JSON.parse(await fs.readFile(filename, 'utf8')) as T & { version?: number };
        if (!object || object.version !== 1) throw new Error('unsupported or missing schema version');
        return object;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw new Error(`Cannot read coder state ${filename}: ${(error as Error).message}. State was preserved; inspect it before recovery.`);
    }
}
/** Read recurrence state without creating directories or missing-state defaults on disk. @private */
export async function readLedger(workspace: Workspace): Promise<Ledger> {
    const ledger = await readState<Ledger>(path.join(stateDirectory(workspace), 'occurrences.json'));
    if (ledger && (!ledger.tasks || typeof ledger.tasks !== 'object' || Array.isArray(ledger.tasks))) throw new Error('Invalid occurrence ledger: missing task map.');
    return ledger ?? { version: 1, tasks: {} };
}
/** Persist a recurrence revision under an acquired workspace lease. @private */
export async function saveLedger(workspace: Workspace, ledger: Ledger): Promise<void> { await atomicWrite(path.join(stateDirectory(workspace), 'occurrences.json'), ledger); }
/** Derive an opaque journal filename independently from user-controlled task IDs. @private */
function journalPath(workspace: Workspace, id: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid journal identity.');
    return path.join(stateDirectory(workspace), 'journals', `${id}.json`);
}
/** Persist the last proven execution boundary before the next effect. @private */
export async function writeJournal(workspace: Workspace, journal: RunJournal): Promise<void> { await atomicWrite(journalPath(workspace, journal.id), journal); }
/** Read journals in deterministic order without writing to the workspace. @private */
export async function readJournals(workspace: Workspace): Promise<RunJournal[]> {
    let names: string[];
    try { names = await fs.readdir(path.join(stateDirectory(workspace), 'journals')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    const journals: RunJournal[] = [];
    for (const name of names.filter((item) => item.endsWith('.json')).sort()) {
        const journal = await readState<RunJournal>(path.join(stateDirectory(workspace), 'journals', name));
        if (!journal || !journal.id || !journal.taskId || !journal.baseline || !journal.phase) throw new Error(`Invalid recovery journal ${name}; state was preserved.`);
        journals.push(journal);
    }
    return journals;
}
/** Return interrupted work that must be reconciled before new execution. @private */
export async function listRecovery(workspace: Workspace): Promise<RunJournal[]> { return (await readJournals(workspace)).filter((journal) => !['completed', 'failed'].includes(journal.phase)); }
/** Test process existence without treating permission denial as a dead worker. @private */
function processAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}
/** Resolve a shared coordination directory without writing custom files inside .git. @private */
async function leaseDirectory(workspace: Workspace): Promise<string> {
    let root = workspace.gitRoot ?? workspace.projectPath;
    if (workspace.gitRoot) {
        const worktrees = await git(root, ['worktree', 'list', '--porcelain']);
        const first = /^worktree (.+)$/m.exec(worktrees)?.[1];
        if (first) root = first;
    }
    return await confinePath(root, path.join(root, '.promptbook', 'ptbk-coder'));
}
/** Acquire a workspace lease. Dead ownership is adopted only by explicit recovery. @private */
export async function acquireLease(workspace: Workspace, options: { recoverStale?: boolean } = {}): Promise<WorkspaceLease> {
    const directory = await leaseDirectory(workspace); await fs.mkdir(directory, { recursive: true });
    const filename = path.join(directory, 'workspace.lock');
    const token = randomUUID();
    const owner = { version: 1, token, pid: process.pid, host: os.hostname(), projectPath: workspace.projectPath, gitRoot: workspace.gitRoot, startedAt: Date.now(), heartbeat: Date.now() };
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const handle = await fs.open(filename, 'wx', 0o600);
            await handle.writeFile(`${JSON.stringify(owner, null, 2)}\n`); await handle.close();
            let heartbeat = Promise.resolve();
            let releasing = false;
            const interval = setInterval(() => { if (releasing) return; heartbeat = heartbeat.then(async () => {
                try { const current = JSON.parse(await fs.readFile(filename, 'utf8')) as { token: string }; if (current.token === token) await atomicWrite(filename, { ...owner, heartbeat: Date.now() }); }
                catch { /* A failed heartbeat cannot justify taking ownership from another worker. */ }
            }); }, 5_000); interval.unref();
            return { token, path: filename, async assertOwned() {
                const current = JSON.parse(await fs.readFile(filename, 'utf8')) as { token: string };
                if (current.token !== token) throw new Error('Workspace ownership token changed; mutation was refused.');
            }, async release() {
                releasing = true;
                clearInterval(interval);
                await heartbeat;
                try { const current = JSON.parse(await fs.readFile(filename, 'utf8')) as { token: string }; if (current.token !== token) throw new Error('Workspace ownership token changed; lease was preserved.'); await fs.unlink(filename); }
                catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            } };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            let previous: typeof owner;
            try { previous = JSON.parse(await fs.readFile(filename, 'utf8')) as typeof owner; }
            catch { throw new Error(`Workspace lease ${filename} is malformed; do not remove it while another worker may be active.`); }
            if (!previous.token || !Number.isInteger(previous.pid) || !previous.host) throw new Error(`Workspace lease ${filename} has no verifiable ownership; inspect it manually.`);
            const sameHost = previous.host === os.hostname();
            const live = !sameHost || processAlive(previous.pid);
            if (!options.recoverStale || live || attempt > 0) throw new Error(`Workspace is owned by PID ${previous.pid} on ${previous.host}. ${live ? 'Wait for the worker to finish.' : 'Use an explicit recover action to reconcile this interrupted run; the stale lease was preserved.'}`);
            const verify = JSON.parse(await fs.readFile(filename, 'utf8')) as typeof owner;
            if (verify.token !== previous.token) throw new Error('Workspace ownership changed during recovery.');
            await fs.rename(filename, path.join(directory, `recovered-${previous.token}.lock`));
        }
    }
    throw new Error('Could not acquire workspace lease.');
}
/** Serialize a mutating authoring, migration, or execution transaction. @private */
export async function withLease<T>(workspace: Workspace, action: () => Promise<T>): Promise<T> {
    const lease = await acquireLease(workspace); try { return await action(); } finally { await lease.release(); }
}
