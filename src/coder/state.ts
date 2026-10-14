import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { TaskDefinition, Workspace } from './domain.js';
import { git, type FileSnapshot, type GitIdentity, type GitSnapshot } from './git.js';
import { confinePath } from './workspace.js';
import { replaceFileWithRetry, type FileReplacementOptions } from './file-replacement.js';

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
    harness?: string; harnessVersion?: string; model?: string; agent?: string; thinkingLevel?: string; authentication?: string; effectiveModel?: string;
}
/** Recoverable phase boundaries contain exact ownership evidence and commit intents. @private */
export interface RunJournal {
    version: 1; id: string; taskId: string; occurrenceId: string; task: TaskDefinition;
    phase: 'claimed' | 'running' | 'awaiting-user' | 'implementation-ready' | 'checking' | 'completion-ready' | 'integrating' | 'completed' | 'recovery-required' | 'failed';
    startedAt: number; updatedAt: number; dueSlot: number; baseline: GitSnapshot;
    expected?: GitSnapshot; completionRollback?: GitSnapshot; metadataPaths?: string[]; protectedPaths: string[]; commits: string[]; attempts: number;
    engineVersion?: string; harness?: string; harnessVersion?: string; model?: string; output?: string; checkCommand?: string; error?: string;
    pendingPhase?: string; safePhase?: 'implementation-ready' | 'completion-ready' | 'integrating'; syncPending?: boolean; checks?: string; trace?: string;
    thinkingLevel?: string; authentication?: string; effectiveModel?: string; usage?: Record<string, number>; sessionId?: string; identity?: GitIdentity;
    legacyTrace?: string; legacyTraceHash?: string;
    agent?: string; agentInstructionsHash?: string;
    sourceSnapshot?: { revision: string; payloadHash: string; gitHead: string | null };
    attemptHistory?: AttemptRecord[]; truncatedAttempts?: number; technicalRetries?: number; externalEffects?: boolean; acceptance?: { satisfied: boolean; evidence: string };
    awaitingRequestIds?: string[]; handledRequestIds?: string[]; userFeedback?: string;
    learning?: { open: boolean; limits?: string }; followupPath?: string; learningTarget?: string;
    isolation?: { view: string; branch: string; origin: GitSnapshot; sourcePath: string }; 
}
/** Exclusive mutation ownership shared by nested projects and related Git worktrees. @private */
export interface WorkspaceLease { token: string; path: string; assertOwned(): Promise<void>; release(): Promise<void> }
/** Keep all owned operational state in the configured project directory. @private */
export function stateDirectory(workspace: Workspace): string { return workspace.statePath; }
/** Filesystem seams keep atomic replacement and Windows sharing failures independently verifiable. @private */
export interface AtomicWriteOptions extends FileReplacementOptions {}
/** Publish complete JSON or binary state using the same atomic replacement and sharing retries. */
async function atomicReplace(filename: string, write: (handle: FileHandle) => Promise<void>, options: AtomicWriteOptions = {}): Promise<void> {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
        const handle = await fs.open(temporary, 'wx', 0o600);
        try { await write(handle); await handle.sync(); } finally { await handle.close(); }
        await replaceFileWithRetry(temporary, filename, undefined, options);
    } finally { await fs.rm(temporary, { force: true }); }
}
/** Write a complete state file atomically; a crash leaves the previous complete revision. @private */
export async function atomicWrite(filename: string, value: unknown, options: AtomicWriteOptions = {}): Promise<void> {
    await atomicReplace(filename, handle => handle.writeFile(`${JSON.stringify(value, null, 2)}\n`), options);
}
/** Read a required versioned object and distinguish absent state from corruption. @private */
async function readState<T>(filename: string, versions: readonly number[] = [1]): Promise<T | undefined> {
    try {
        const object = JSON.parse(await fs.readFile(filename, 'utf8')) as T & { version?: number };
        if (!object || !versions.includes(object.version!)) throw new Error('unsupported or missing schema version');
        return object;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw new Error(`Cannot read ptbk state ${filename}: ${(error as Error).message}. State was preserved; inspect it before recovery.`);
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

/** New snapshots reference immutable bytes; optional inline content supports existing journals. */
interface StoredFileSnapshot extends Omit<FileSnapshot, 'content'> { content?: string; contentRef?: string }
/** Snapshot metadata remains in the journal independently of the checkout's aggregate byte size. */
interface StoredSnapshot extends Omit<GitSnapshot, 'files'> { files: Record<string, StoredFileSnapshot> }
/** Every ownership boundary uses the same compact snapshot representation on disk. */
interface StoredJournal extends Omit<RunJournal, 'version' | 'baseline' | 'expected' | 'completionRollback' | 'isolation'> {
    version: 1 | 2;
    baseline: StoredSnapshot; expected?: StoredSnapshot; completionRollback?: StoredSnapshot;
    isolation?: Omit<NonNullable<RunJournal['isolation']>, 'origin'> & { origin: StoredSnapshot };
}

/** Only validated content hashes may select files in the project-local snapshot store. */
function snapshotBlobPath(directory: string, hash: string): string {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid recovery snapshot reference; state was preserved.');
    return path.join(directory, hash);
}

/** Verify stored bytes before they can participate in restoration or a new journal revision. */
async function readSnapshotBlob(directory: string, hash: string): Promise<Buffer> {
    const filename = snapshotBlobPath(directory, hash);
    try {
        if (!(await fs.lstat(filename)).isFile()) throw new Error(`Recovery snapshot ${hash} is corrupt; state was preserved.`);
        const bytes = await fs.readFile(filename);
        if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error(`Recovery snapshot ${hash} is corrupt; state was preserved.`);
        return bytes;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`Recovery snapshot ${hash} is missing; state was preserved.`, { cause: error });
        throw error;
    }
}

/** Save each distinct byte sequence before publishing any journal that references it. */
async function storeSnapshot(snapshot: GitSnapshot, directory: string, contents: Map<string, string>): Promise<StoredSnapshot> {
    const files: [string, StoredFileSnapshot][] = [];
    for (const [name, file] of Object.entries(snapshot.files)) {
        const filename = snapshotBlobPath(directory, file.hash);
        if (contents.get(file.hash) !== file.content) {
            const bytes = Buffer.from(file.content, 'base64');
            if (createHash('sha256').update(bytes).digest('hex') !== file.hash) throw new Error(`Recovery snapshot ${file.hash} is corrupt; state was preserved.`);
            try {
                await fs.lstat(filename);
                await readSnapshotBlob(directory, file.hash);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
                await atomicReplace(filename, handle => handle.writeFile(bytes));
            }
            contents.set(file.hash, file.content);
        }
        files.push([name, { hash: file.hash, mode: file.mode, kind: file.kind, contentRef: file.hash }]);
    }
    return { ...snapshot, files: Object.fromEntries(files) };
}

/** Restore the in-memory snapshot contract and share identical strings across all boundaries. */
async function loadSnapshot(snapshot: StoredSnapshot, directory: string, contents: Map<string, string>): Promise<GitSnapshot> {
    const files: [string, FileSnapshot][] = [];
    for (const [name, file] of Object.entries(snapshot.files)) {
        let content: string;
        if (typeof file.content === 'string' && file.contentRef === undefined) content = file.content;
        else if (typeof file.contentRef === 'string' && file.contentRef === file.hash && file.content === undefined) {
            const cached = contents.get(file.contentRef);
            content = cached ?? (await readSnapshotBlob(directory, file.contentRef)).toString('base64');
            contents.set(file.contentRef, content);
        } else throw new Error(`Invalid recovery snapshot for ${name}; state was preserved.`);
        files.push([name, { hash: file.hash, mode: file.mode, kind: file.kind, content }]);
    }
    return { ...snapshot, files: Object.fromEntries(files) };
}

/** Persist compact metadata and deduplicated exact bytes before the next effect. @private */
export async function writeJournal(workspace: Workspace, journal: RunJournal): Promise<void> {
    const filename = journalPath(workspace, journal.id);
    await fs.mkdir(stateDirectory(workspace), { recursive: true });
    // Isolated checkouts share the origin's operational state, outside their projectPath.
    const directory = await confinePath(stateDirectory(workspace), path.join(stateDirectory(workspace), 'snapshot-blobs'));
    await fs.mkdir(directory, { recursive: true });
    const contents = new Map<string, string>();
    const stored: StoredJournal = {
        ...journal,
        version: 2,
        baseline: await storeSnapshot(journal.baseline, directory, contents),
        expected: journal.expected ? await storeSnapshot(journal.expected, directory, contents) : undefined,
        completionRollback: journal.completionRollback ? await storeSnapshot(journal.completionRollback, directory, contents) : undefined,
        isolation: journal.isolation ? { ...journal.isolation, origin: await storeSnapshot(journal.isolation.origin, directory, contents) } : undefined,
    };
    await atomicWrite(filename, stored);
}
/** Read journals in deterministic order without writing to the workspace. @private */
export async function readJournals(workspace: Workspace, include: (journal: RunJournal) => boolean = () => true): Promise<RunJournal[]> {
    let names: string[];
    try { names = await fs.readdir(path.join(stateDirectory(workspace), 'journals')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    const journals: RunJournal[] = [];
    const directory = await confinePath(stateDirectory(workspace), path.join(stateDirectory(workspace), 'snapshot-blobs'));
    const contents = new Map<string, string>();
    for (const name of names.filter((item) => item.endsWith('.json')).sort()) {
        const stored = await readState<StoredJournal>(path.join(stateDirectory(workspace), 'journals', name), [1, 2]);
        if (!stored || !stored.id || !stored.taskId || !stored.baseline || !stored.phase) throw new Error(`Invalid recovery journal ${name}; state was preserved.`);
        const { baseline, expected, completionRollback, isolation, ...metadata } = stored;
        const journal: RunJournal = {
            ...metadata,
            version: 1,
            baseline: await loadSnapshot(baseline, directory, contents),
            ...(expected ? { expected: await loadSnapshot(expected, directory, contents) } : {}),
            ...(completionRollback ? { completionRollback: await loadSnapshot(completionRollback, directory, contents) } : {}),
            ...(isolation ? { isolation: { ...isolation, origin: await loadSnapshot(isolation.origin, directory, contents) } } : {}),
        };
        if (include(journal)) journals.push(journal);
    }
    return journals;
}
/** Return interrupted work that must be reconciled before new execution. @private */
export async function listRecovery(workspace: Workspace, options: { includeSync?: boolean } = {}): Promise<RunJournal[]> { return readJournals(workspace, journal => !['completed', 'failed'].includes(journal.phase) || Boolean(options.includeSync && journal.syncPending)); }
/** Test process existence without treating permission denial as a dead worker. @private */
function processAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}
/** Inspect a process birth identity so PID reuse cannot impersonate the original worker. @private */
export async function processBirth(pid: number): Promise<string | undefined> {
    if (!Number.isSafeInteger(pid) || pid <= 0) return undefined;
    try {
        const execute = promisify(execFile);
        const result = process.platform === 'win32'
            ? await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `[System.Diagnostics.Process]::GetProcessById(${pid}).StartTime.ToUniversalTime().Ticks`], { timeout: 5_000 })
            : await execute('ps', ['-p', String(pid), '-o', 'lstart='], { timeout: 5_000, env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' } });
        return result.stdout.trim() || undefined;
    } catch { return undefined; }
}
/** Resolve a shared coordination directory without writing custom files inside .git. @private */
async function leaseDirectory(workspace: Workspace): Promise<string> {
    let root = workspace.gitRoot ?? workspace.projectPath;
    if (workspace.gitRoot) {
        const worktrees = await git(root, ['worktree', 'list', '--porcelain', '-z']);
        const first = worktrees.split('\0').find(record => record.startsWith('worktree '))?.slice('worktree '.length);
        if (first) root = first;
    }
    return await confinePath(root, path.join(root, '.ptbk'));
}
/** Acquire a workspace lease. Dead ownership is adopted only by explicit recovery. @private */
export async function acquireLease(workspace: Workspace, options: { recoverStale?: boolean } = {}): Promise<WorkspaceLease> {
    const directory = await leaseDirectory(workspace); await fs.mkdir(directory, { recursive: true });
    const filename = path.join(directory, 'workspace.lock');
    const token = randomUUID();
    const owner = { version: 1, token, birth: await processBirth(process.pid), pid: process.pid, host: os.hostname(), projectPath: workspace.projectPath, gitRoot: workspace.gitRoot, startedAt: Date.now(), heartbeat: Date.now() };
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
            const alive = sameHost && processAlive(previous.pid);
            const birth = alive ? await processBirth(previous.pid) : undefined;
            const live = !sameHost || alive && (!previous.birth || !birth || previous.birth === birth);
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
