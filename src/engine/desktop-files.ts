import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { errorMessage, PtbkError } from '../common/errors.js';
import { isPathInside, writeFileAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { fileKind } from '../project/files.js';
import { git, ignoredPaths } from '../project/git.js';

/**
 * Quiet period after the latest accepted change of a compatible batch before it is committed.
 *
 * @private desktop Files
 */
export const DESKTOP_FILES_QUIET_MS = 15_000;

/**
 * Hard cap from the first accepted change of a batch (an import still writing flushes at its safe completion).
 *
 * @private desktop Files
 */
export const DESKTOP_FILES_MAX_AGE_MS = 60_000;

/**
 * Retry interval of a failed commit (only persistence is retried, never the user operation).
 */
const RETRY_MS = 60_000;

/**
 * Most bytes of one text file edited in the desktop editor.
 */
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

/**
 * Most bytes of one imported file.
 */
const MAX_IMPORT_FILE_BYTES = 512 * 1024 * 1024;

/**
 * Most entries (files and folders) of one operation.
 */
const MAX_OPERATION_ENTRIES = 20_000;

/**
 * Lifetime of an unapplied preflight review.
 */
const REVIEW_TTL_MS = 30 * 60_000;

/**
 * Recent persistence outcomes kept for the Files view.
 */
const RECENT_OUTCOMES = 10;

/**
 * The commit trailer identifying Promptbook Desktop as the operation source.
 *
 * @private desktop Files
 */
export const DESKTOP_OPERATION_TRAILER = { 'Operation-Source': 'Promptbook Desktop' } as const;

/**
 * Dot names that are never written, replaced or deleted through Files (repository, runtime state, secrets).
 */
const PROTECTED_NAME = /^\.(git|ptbk|env)(\b|$)|^\.(ssh|gnupg|npmrc|netrc)$/i;

/**
 * Ordinary text kinds the desktop text editor saves (Books keep their own scoped save path).
 */
const TEXT_KINDS = new Set(['text', 'markdown', 'json']);

/**
 * How a colliding target name is resolved.
 *
 * @private desktop Files
 */
export type CollisionChoice = 'keep-both' | 'skip' | 'replace';

/**
 * A bulk Files operation.
 *
 * @private desktop Files
 */
export type FileOperationKind = 'import' | 'copy' | 'delete';

/**
 * One requested entry: for an import a path relative to the dropped selection (`assets/logo.png`), for copy and delete
 * a project-relative path.
 *
 * @private desktop Files
 */
export type FileOperationEntry = { readonly path: string; readonly type?: 'file' | 'directory'; readonly size?: number };

/**
 * One top-level item of a preflight review.
 *
 * @private desktop Files
 */
export type ReviewItem = {
    /** The selected path (import: its name in the dropped selection). */
    readonly path: string;
    /** Project-relative target of an import/copy (after Keep Both, its actual new name). */
    readonly target?: string;
    readonly status: 'ok' | 'collision' | 'rejected';
    readonly reason?: string;
    readonly files: number;
    readonly folders: number;
    /** Descendants that are not written or are hidden from the client (named in `rejected`). */
    readonly rejected?: readonly string[];
    /** Hidden descendants included in a deletion scope. */
    readonly hidden?: number;
};

/**
 * The single review of an operation before it writes anything.
 *
 * @private desktop Files
 */
export type FileOperationReview = {
    readonly id: string;
    readonly kind: FileOperationKind;
    readonly destination?: string;
    readonly items: readonly ReviewItem[];
    /** Colliding or rejected items need the review dialog; a deletion is always confirmed with its scope. */
    readonly needsReview: boolean;
    readonly summary: string;
};

/**
 * An applied operation: per-item results and, for an import, the files the client uploads next.
 *
 * @private desktop Files
 */
export type FileOperationResult = {
    readonly id: string;
    readonly kind: FileOperationKind;
    readonly state: 'writing' | 'completed' | 'interrupted';
    readonly accepted: readonly string[];
    readonly skipped: readonly string[];
    readonly conflicting: ReadonlyArray<{ readonly path: string; readonly reason: string }>;
    /** Import: the uploads still expected (index into the requested entries and the project-relative target). */
    readonly uploads?: ReadonlyArray<{ readonly index: number; readonly target: string }>;
    readonly summary: string;
};

/**
 * Persistence state of one batch as the Files view shows it.
 *
 * @private desktop Files
 */
export type DesktopBatchView = {
    readonly id: string;
    readonly subject: string;
    readonly kind: 'save' | FileOperationKind;
    /** `pending`: Saved · Pending commit; `review`: an interrupted operation waits for a decision. */
    readonly state: 'pending' | 'writing' | 'committing' | 'blocked' | 'failed' | 'review';
    readonly paths: readonly string[];
    readonly firstAt: string;
    readonly lastAt: string;
    /** When the batch is committed without further changes (absent while blocked/failed/review). */
    readonly dueAt?: string;
    readonly reason?: string;
};

/**
 * The Files persistence view (part of the engine snapshot).
 *
 * @private desktop Files
 */
export type DesktopFilesView = {
    readonly batches: readonly DesktopBatchView[];
    readonly recent: ReadonlyArray<{ readonly subject: string; readonly at: string; readonly outcome: 'committed' | 'uncommitted' | 'ignored' | 'dismissed'; readonly sha?: string; readonly detail?: string }>;
};

/**
 * An editable text source with its revision.
 *
 * @private desktop Files
 */
export type TextSource = { readonly path: string; readonly text: string; readonly revision: string; readonly editable: boolean; readonly reason?: string };

/**
 * Outcome of a text save.
 *
 * @private desktop Files
 */
export type TextSaveOutcome =
    | { readonly status: 'saved'; readonly path: string; readonly revision: string; readonly persistence: 'pending' | 'uncommitted' | 'ignored' }
    | { readonly status: 'unchanged'; readonly path: string; readonly revision: string }
    | { readonly status: 'conflict'; readonly path: string; readonly message: string; readonly current?: { readonly text: string; readonly revision: string } };

/**
 * Engine services the desktop Files operations use.
 *
 * @private desktop Files
 */
export type DesktopFilesHost = {
    readonly projectRoot: string;
    readonly stateFile: string;
    readonly temporaryDirectory: string;
    /** Project-relative entity roots (agents, tasks, chats): never replaced or deleted, and their Books only through domain controls. */
    readonly entityRoots: () => readonly string[];
    /** Project-relative files that are never replaced or deleted (configuration, the report feed). */
    readonly protectedFiles: () => readonly string[];
    /** The active task owning an absolute path, if any. */
    readonly ownerOf: (absolutePath: string) => string | undefined;
    /** Whether the project commits its operations (false in an explicit no-commit workflow). */
    readonly commitMode: () => boolean;
    /** Scoped commit through the engine's Git lock and synchronization boundaries. */
    readonly commit: (absolutePaths: readonly string[], subject: string, trailers: Readonly<Record<string, string>>) => Promise<string | undefined>;
    /** Absolute paths become engine-authored pending persistence (true) or stop being so (false). */
    readonly reserve: (absolutePaths: readonly string[], pending: boolean) => void;
    readonly onChange: () => void;
    readonly log: (text: string, level: 'info' | 'warning' | 'error') => void;
    readonly quietMs?: number;
    readonly maxAgeMs?: number;
};

/**
 * One batch of accepted changes waiting for its commit (persisted for recovery).
 */
type Batch = {
    id: string;
    /** Compatibility key: `save:<path>`, `import:<destination>:<view>`, `copy:<destination>:<view>`; deletes are unique. */
    key: string;
    kind: 'save' | FileOperationKind;
    destination?: string;
    /** Project-relative path → accepted SHA-256 (`null`: accepted as removed). */
    paths: Record<string, string | null>;
    files: number;
    folders: number;
    firstAt: number;
    lastAt: number;
    /** Operations of this batch still writing. */
    writing: string[];
    state: 'pending' | 'committing' | 'blocked' | 'failed' | 'review';
    reason?: string;
    retryAt?: number;
    /** The selected items of a deletion (its subject; `paths` holds the tracked files it removed). */
    selection?: string[];
};

/**
 * An accepted operation that is still writing (persisted so that an interruption identifies applied items).
 */
type Operation = {
    id: string;
    kind: FileOperationKind;
    batch: string;
    /** Planned writes: project-relative target, type, and the accepted hash once written. */
    plan: Array<{ index: number; target: string; type: 'file' | 'directory'; source?: string; done?: string | null; size?: number }>;
    choice: CollisionChoice;
    startedAt: number;
};

/**
 * An unapplied preflight review (memory only; it expires).
 */
type PendingReview = {
    readonly review: FileOperationReview;
    readonly entries: readonly FileOperationEntry[];
    readonly view: string;
    readonly expiresAt: number;
};

/**
 * Persisted journal of the desktop Files operations.
 */
type Journal = { batches: Batch[]; operations: Operation[]; recent: DesktopFilesView['recent'] };

/**
 * SHA-256 of bytes.
 */
function sha256(bytes: Uint8Array | string): string {
    return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The current content of a tracked path for verification: its SHA-256, `null` when absent, `directory` for a folder.
 */
async function currentContent(absolute: string): Promise<string | null> {
    const info = await lstat(absolute).catch(() => undefined);
    if (!info) return null;
    if (!info.isFile()) return info.isDirectory() ? 'directory' : 'other';
    return sha256(await readFile(absolute));
}

/**
 * Normalizes a client-supplied relative path (POSIX separators, no leading/trailing slashes).
 */
function normalize(path: string): string {
    return String(path).replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.\/|^\/+|\/+$/g, '');
}

/**
 * Whether a file name is equal to another one on this platform's default filesystems (case-insensitive on Windows and
 * macOS).
 */
function sameName(a: string, b: string): boolean {
    return process.platform === 'win32' || process.platform === 'darwin' ? a.toLocaleLowerCase('en') === b.toLocaleLowerCase('en') : a === b;
}

/**
 * `name (2).ext`, `name (3).ext`, … for Keep Both.
 */
function numberedName(name: string, attempt: number): string {
    const extension = extname(name);
    const stem = extension && extension !== name ? name.slice(0, -extension.length) : name;
    return `${stem} (${attempt})${extension && extension !== name ? extension : ''}`;
}

/**
 * Plural helper.
 */
function count(value: number, noun: string): string {
    return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

/**
 * Engine-owned desktop Files operations: text saves with revision and ownership checks, imports (uploaded by the local
 * client), copies within the project and confirmed deletions, each preflighted as a whole before anything is written.
 * Accepted changes are saved at once and committed in scoped batches: compatible changes after a quiet period, at the
 * latest after a cap from their first change; a deletion is its own commit. The journal survives interruptions, so
 * persistence resumes without replaying a user operation, and an interrupted operation waits for review.
 *
 * @private desktop Files
 */
export class DesktopFiles {
    private journal: Journal = { batches: [], operations: [], recent: [] };
    private readonly reviews = new Map<string, PendingReview>();
    private readonly mutex = new Mutex();
    private timer?: NodeJS.Timeout;
    private loaded = false;
    private disposed = false;

    public constructor(private readonly host: DesktopFilesHost) {}

    private get quietMs(): number {
        return this.host.quietMs ?? DESKTOP_FILES_QUIET_MS;
    }

    private get maxAgeMs(): number {
        return Math.max(this.quietMs, this.host.maxAgeMs ?? DESKTOP_FILES_MAX_AGE_MS);
    }

    // ── Journal and recovery ─────────────────────────────────────────────────

    /**
     * Loads the journal after a restart: pending batches resume their persistence (verified against their accepted
     * content), an operation that was still writing becomes an interrupted operation for review, and abandoned
     * uploads are removed.
     */
    public async recover(): Promise<void> {
        await this.mutex.run(async () => {
            this.loaded = true;
            const saved = await readFile(this.host.stateFile, 'utf8').then((text) => JSON.parse(text) as Partial<Journal>, () => undefined);
            this.journal = { batches: saved?.batches ?? [], operations: saved?.operations ?? [], recent: saved?.recent ?? [] };
            for (const operation of this.journal.operations) {
                const batch = this.journal.batches.find((item) => item.id === operation.batch);
                if (!batch) continue;
                batch.writing = batch.writing.filter((id) => id !== operation.id);
                for (const item of operation.plan) if (item.type === 'file' && typeof item.done === 'string') batch.paths[item.target] = item.done;
                const missing = operation.plan.filter((item) => item.done === undefined && item.type === 'file').map((item) => item.target);
                batch.state = 'review';
                batch.reason = `Interrupted: ${missing.length ? `${count(missing.length, 'file')} ${missing.length === 1 ? 'was' : 'were'} not written (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''})` : 'the operation did not confirm its completion'}. Commit the applied items or dismiss to keep them uncommitted.`;
            }
            this.journal.operations = [];
            for (const batch of this.journal.batches) {
                if (batch.state === 'committing') batch.state = 'pending';
                this.host.reserve(this.absolutes(batch), true);
            }
            await rm(join(this.host.temporaryDirectory, 'desktop-files'), { recursive: true, force: true }).catch(() => undefined);
            await this.save();
        });
        this.arm();
        this.host.onChange();
    }

    /** Persists the journal. */
    private async save(): Promise<void> {
        if (!this.journal.batches.length && !this.journal.operations.length && !this.journal.recent.length) {
            await rm(this.host.stateFile, { force: true });
            return;
        }
        await mkdir(dirname(this.host.stateFile), { recursive: true });
        await writeFileAtomic(this.host.stateFile, `${JSON.stringify(this.journal, null, 2)}\n`);
    }

    /** Ends the timer (a graceful stop flushes first). */
    public dispose(): void {
        this.disposed = true;
        clearTimeout(this.timer);
    }

    /** The Files persistence view. */
    public view(): DesktopFilesView {
        return {
            batches: this.journal.batches.map((batch) => {
                const due = batch.state === 'pending' && !batch.writing.length ? Math.min(batch.lastAt + this.quietMs, batch.firstAt + this.maxAgeMs) : batch.state === 'failed' ? batch.retryAt : undefined;
                return {
                    id: batch.id,
                    subject: this.subject(batch),
                    kind: batch.kind,
                    state: batch.writing.length && batch.state === 'pending' ? 'writing' : batch.state,
                    paths: Object.keys(batch.paths).sort(),
                    firstAt: new Date(batch.firstAt).toISOString(),
                    lastAt: new Date(batch.lastAt).toISOString(),
                    ...(due ? { dueAt: new Date(due).toISOString() } : {}),
                    ...(batch.reason ? { reason: batch.reason } : {}),
                };
            }),
            recent: this.journal.recent,
        };
    }

    /** A verified pending desktop origin of an absolute path (History's current changes). */
    public pendingOrigin(absolutePath: string): { readonly kind: 'pending-desktop'; readonly label: string } | undefined {
        const path = this.relative(absolutePath);
        if (path === undefined) return undefined;
        const batch = this.journal.batches.find((item) => Object.keys(item.paths).some((candidate) => candidate === path || path.startsWith(`${candidate}/`)));
        return batch ? { kind: 'pending-desktop', label: `Promptbook Desktop · ${batch.state === 'pending' ? 'Saved · Pending commit' : batch.state}: ${this.subject(batch)}` } : undefined;
    }

    // ── Paths and confinement ────────────────────────────────────────────────

    /** Project-relative POSIX path of an absolute path inside the project. */
    private relative(absolutePath: string): string | undefined {
        const root = resolve(this.host.projectRoot);
        const path = resolve(absolutePath);
        if (path === root) return '';
        if (!isPathInside(root, path)) return undefined;
        return path.slice(root.length + 1).split(sep).join('/');
    }

    /** Absolute paths of a batch. */
    private absolutes(batch: Batch): string[] {
        return Object.keys(batch.paths).map((path) => resolve(this.host.projectRoot, ...path.split('/')));
    }

    /**
     * Why a project-relative path may not be written, replaced or deleted through Files (undefined when it may):
     * hidden or protected segments, escapes, protected files and entity roots. Readable core Books stay read-only.
     */
    private protection(path: string, purpose: 'write' | 'replace' | 'delete'): string | undefined {
        if (!path) return 'The project root itself is protected.';
        const segments = path.split('/');
        if (segments.some((segment) => segment === '..' || segment === '.')) return 'The path leaves the project.';
        const hidden = segments.find((segment) => segment.startsWith('.'));
        if (hidden) return PROTECTED_NAME.test(hidden) ? `${hidden} holds repository, runtime or secret data and is protected.` : 'Hidden paths are not written through Files.';
        if (this.host.protectedFiles().some((file) => sameName(file, path))) return `${path} is protected; change it through its own controls.`;
        const entityRoot = this.host.entityRoots().find((root) => root && (sameName(root, path) || path.toLocaleLowerCase('en').startsWith(`${root.toLocaleLowerCase('en')}/`)));
        if (entityRoot && sameName(entityRoot, path) && purpose !== 'write') return `${path} is an entity root of the project and is protected.`;
        if (entityRoot && purpose !== 'write' && extname(path).toLowerCase() === '.book') return `${path} is a Book of the project; remove or replace it through its Agents, Tasks or Chats controls.`;
        return undefined;
    }

    /**
     * Resolves a project-relative path for a write: its nearest existing ancestor must canonically stay inside the
     * project (no symlink or junction leads out), and an existing target is never followed as a link.
     */
    private async writable(path: string, purpose: 'write' | 'replace' | 'delete'): Promise<{ readonly absolute: string; readonly exists: boolean; readonly type?: 'file' | 'directory' | 'link' }> {
        const reason = this.protection(path, purpose);
        if (reason) throw new PtbkError(reason, { kind: 'usage' });
        const root = await realpath(this.host.projectRoot);
        const absolute = resolve(this.host.projectRoot, ...path.split('/'));
        let ancestor = dirname(absolute);
        while (!(await lstat(ancestor).catch(() => undefined))) ancestor = dirname(ancestor);
        const real = await realpath(ancestor).catch(() => undefined);
        if (!real || (real !== root && !isPathInside(root, real))) throw new PtbkError(`${path} leads outside the project through a link.`, { kind: 'usage' });
        const info = await lstat(absolute).catch(() => undefined);
        if (info?.isSymbolicLink()) {
            if (purpose === 'delete') return { absolute, exists: true, type: 'link' };
            throw new PtbkError(`${path} is a link; Files does not write through links.`, { kind: 'usage' });
        }
        return { absolute, exists: Boolean(info), ...(info ? { type: info.isDirectory() ? ('directory' as const) : ('file' as const) } : {}) };
    }

    /** Existing names of a project folder (for collision checks; missing folders are empty). */
    private async names(directory: string): Promise<string[]> {
        return await readdir(directory).catch(() => [] as string[]);
    }

    /** A free Keep Both name next to the existing names. */
    private keepBoth(name: string, existing: readonly string[]): string {
        for (let attempt = 2; ; attempt++) {
            const candidate = numberedName(name, attempt);
            if (!existing.some((item) => sameName(item, candidate))) return candidate;
        }
    }

    // ── Text editing ─────────────────────────────────────────────────────────

    /** An ordinary text file with its revision for the desktop editor (Books use the Book editor). */
    public async readText(path: string): Promise<TextSource> {
        const relative = normalize(path);
        const reason = this.protection(relative, 'write');
        const absolute = resolve(this.host.projectRoot, ...relative.split('/'));
        const root = await realpath(this.host.projectRoot);
        const real = await realpath(absolute).catch(() => undefined);
        if (!real) throw new PtbkError(`${relative} no longer exists.`, { kind: 'not-found' });
        if (real !== root && !isPathInside(root, real)) throw new PtbkError(`${relative} leads outside the project and is not opened.`, { kind: 'usage' });
        const info = await stat(absolute);
        if (!info.isFile()) throw new PtbkError(`${relative} is not a file.`, { kind: 'usage' });
        if (info.size > MAX_TEXT_BYTES) throw new PtbkError(`${relative} is too large for the text editor.`, { kind: 'usage' });
        const bytes = await readFile(absolute);
        if (bytes.includes(0)) throw new PtbkError(`${relative} is not a text file.`, { kind: 'usage' });
        const kind = fileKind(relative);
        const editable = !reason && TEXT_KINDS.has(kind);
        const owner = this.host.ownerOf(absolute);
        return { path: relative, text: bytes.toString('utf8'), revision: sha256(bytes), editable: editable && !owner, ...(reason ? { reason } : kind === 'book' ? { reason: 'Books are saved through the Book editor.' } : !editable ? { reason: 'Only ordinary text files are edited here.' } : owner ? { reason: `${owner} is changing this file now.` } : {}) };
    }

    /**
     * Saves an edited ordinary text file against the revision the editor started from: a stale revision or a file an
     * active task owns is a conflict (nothing is written; the client keeps the draft), an unchanged text is a no-op.
     * The accepted content joins the file's pending commit batch.
     */
    public async saveText(input: { readonly path: string; readonly text: string; readonly revision: string }): Promise<TextSaveOutcome> {
        const path = normalize(input.path);
        if (fileKind(path) === 'book') throw new PtbkError('Books are saved through the Book editor and its own scoped commit.', { kind: 'usage' });
        if (!TEXT_KINDS.has(fileKind(path))) throw new PtbkError(`${path} is not an ordinary text file.`, { kind: 'usage' });
        if (Buffer.byteLength(input.text) > MAX_TEXT_BYTES) throw new PtbkError(`${path} is too large for the text editor.`, { kind: 'usage' });
        return await this.mutex.run(async (): Promise<TextSaveOutcome> => {
            const target = await this.writable(path, 'replace');
            if (target.type === 'directory') throw new PtbkError(`${path} is a folder.`, { kind: 'usage' });
            const owner = this.host.ownerOf(target.absolute);
            if (owner) return { status: 'conflict', path, message: `${owner} owns ${path} now; your draft is kept. Save again after it finishes.` };
            const current = target.exists ? await readFile(target.absolute) : undefined;
            const currentRevision = current ? sha256(current) : 'missing';
            if (currentRevision !== input.revision) {
                return { status: 'conflict', path, message: `${path} changed since you opened it; nothing was saved and your draft is kept.`, ...(current && !current.includes(0) && current.length <= MAX_TEXT_BYTES ? { current: { text: current.toString('utf8'), revision: currentRevision } } : {}) };
            }
            const revision = sha256(input.text);
            if (revision === currentRevision) return { status: 'unchanged', path, revision };
            await writeFileAtomic(target.absolute, input.text);
            const persistence = await this.accept(`save:${path}`, 'save', { [path]: revision }, { files: 1, folders: 0 });
            return { status: 'saved', path, revision, persistence };
        });
    }

    // ── Bulk operations ──────────────────────────────────────────────────────

    /**
     * Preflights a whole operation before anything is written: canonical targets, links and junctions, name collisions
     * (case-insensitive where the filesystem is), protected paths and descendants (including those hidden from the
     * client). Returns one review; nothing changes on disk.
     */
    public async preflight(input: { readonly kind: FileOperationKind; readonly destination?: string; readonly entries: readonly FileOperationEntry[]; readonly view?: string }): Promise<FileOperationReview> {
        const kind = input.kind;
        if (!['import', 'copy', 'delete'].includes(kind)) throw new PtbkError(`Unknown Files operation "${String(kind)}".`, { kind: 'usage' });
        const entries = input.entries.slice(0, MAX_OPERATION_ENTRIES + 1).map((entry) => ({ ...entry, path: normalize(entry.path) }));
        if (!entries.length) throw new PtbkError('Select at least one file or folder.', { kind: 'usage' });
        if (entries.length > MAX_OPERATION_ENTRIES) throw new PtbkError(`One operation handles at most ${MAX_OPERATION_ENTRIES} entries; split it.`, { kind: 'usage' });
        this.expireReviews();
        const items = kind === 'delete' ? await this.preflightDelete(entries) : await this.preflightWrite(kind, normalize(input.destination ?? ''), entries);
        const id = randomUUID();
        const colliding = items.filter((item) => item.status === 'collision').length;
        const rejected = items.filter((item) => item.status === 'rejected').length + items.reduce((sum, item) => sum + (item.rejected?.length ?? 0), 0);
        const files = items.filter((item) => item.status !== 'rejected').reduce((sum, item) => sum + item.files, 0);
        const folders = items.filter((item) => item.status !== 'rejected').reduce((sum, item) => sum + item.folders, 0);
        const scope = [count(files, 'file'), ...(folders ? [count(folders, 'folder')] : [])].join(' and ');
        const summary =
            kind === 'delete'
                ? `Delete ${scope}${items.some((item) => item.hidden) ? ` (including ${items.reduce((sum, item) => sum + (item.hidden ?? 0), 0)} hidden)` : ''}${rejected ? `; ${count(rejected, 'item')} cannot be deleted` : ''}.`
                : `${kind === 'import' ? 'Import' : 'Copy'} ${scope} into ${input.destination ? normalize(input.destination) : 'the project root'}${colliding ? `; ${count(colliding, 'name')} already exist` : ''}${rejected ? `; ${count(rejected, 'item')} are not written` : ''}.`;
        const review: FileOperationReview = { id, kind, ...(kind === 'delete' ? {} : { destination: normalize(input.destination ?? '') }), items, needsReview: kind === 'delete' || colliding > 0 || rejected > 0, summary };
        this.reviews.set(id, { review, entries, view: String(input.view ?? '').slice(0, 64), expiresAt: Date.now() + REVIEW_TTL_MS });
        return review;
    }

    /** Drops expired reviews. */
    private expireReviews(): void {
        for (const [id, review] of this.reviews) if (review.expiresAt < Date.now()) this.reviews.delete(id);
    }

    /** Preflight of an import or copy into a destination folder. */
    private async preflightWrite(kind: 'import' | 'copy', destination: string, entries: readonly FileOperationEntry[]): Promise<ReviewItem[]> {
        if (destination) {
            const target = await this.writable(destination, 'write');
            if (target.exists && target.type !== 'directory') throw new PtbkError(`${destination} is not a folder.`, { kind: 'usage' });
        }
        const destinationAbsolute = resolve(this.host.projectRoot, ...destination.split('/').filter(Boolean));
        const existing = await this.names(destinationAbsolute);
        const top = new Map<string, FileOperationEntry[]>();
        if (kind === 'import') {
            for (const entry of entries) {
                const name = entry.path.split('/')[0]!;
                if (!name || entry.path.split('/').includes('..')) throw new PtbkError(`${entry.path} is not a valid name in the dropped selection.`, { kind: 'usage' });
                top.set(name, [...(top.get(name) ?? []), entry]);
            }
        } else for (const entry of entries) top.set(entry.path, [entry]);
        const items: ReviewItem[] = [];
        for (const [path, group] of top) {
            const name = path.split('/').pop()!;
            const target = destination ? `${destination}/${name}` : name;
            const rejected: string[] = [];
            let files = 0;
            let folders = 0;
            if (kind === 'import') {
                for (const entry of group) {
                    if (entry.path.split('/').some((segment) => segment.startsWith('.'))) rejected.push(entry.path);
                    else if (entry.type === 'directory') folders++;
                    else if (typeof entry.size === 'number' && entry.size > MAX_IMPORT_FILE_BYTES) rejected.push(entry.path);
                    else files++;
                }
            } else {
                const source = await this.copySource(path).catch((error: unknown) => error as Error);
                if (source instanceof Error) {
                    items.push({ path, status: 'rejected', reason: errorMessage(source), files: 0, folders: 0 });
                    continue;
                }
                if (destinationAbsolute === source.absolute || isPathInside(source.absolute, destinationAbsolute)) {
                    items.push({ path, status: 'rejected', reason: 'A folder cannot be copied into itself.', files: 0, folders: 0 });
                    continue;
                }
                files = source.files;
                folders = source.folders;
                rejected.push(...source.rejected);
            }
            const protection = this.protection(target, 'write');
            if (protection) {
                items.push({ path, target, status: 'rejected', reason: protection, files, folders });
                continue;
            }
            const collision = existing.find((item) => sameName(item, name));
            const replaceProtection = collision ? this.protection(destination ? `${destination}/${collision}` : collision, 'replace') : undefined;
            items.push({
                path,
                target,
                status: collision ? 'collision' : 'ok',
                ...(collision ? { reason: replaceProtection ? `${collision} exists and is protected (Keep Both or Skip).` : `${collision} already exists.` } : {}),
                files,
                folders,
                ...(rejected.length ? { rejected } : {}),
            });
        }
        return items;
    }

    /** Walks a copy source inside the project (links and hidden descendants are not copied). */
    private async copySource(path: string): Promise<{ readonly absolute: string; readonly files: number; readonly folders: number; readonly rejected: string[]; readonly entries: FileOperationEntry[] }> {
        if (path.split('/').some((segment) => segment.startsWith('.') || segment === '..')) throw new PtbkError('Hidden paths are not copied through Files.', { kind: 'usage' });
        const absolute = resolve(this.host.projectRoot, ...path.split('/'));
        const root = await realpath(this.host.projectRoot);
        const real = await realpath(absolute).catch(() => undefined);
        if (!real) throw new PtbkError(`${path} no longer exists.`, { kind: 'not-found' });
        if (real !== root && !isPathInside(root, real)) throw new PtbkError(`${path} leads outside the project.`, { kind: 'usage' });
        const info = await lstat(absolute);
        if (info.isSymbolicLink()) throw new PtbkError(`${path} is a link and is not copied.`, { kind: 'usage' });
        const entries: Array<{ path: string; type: 'file' | 'directory' }> = [];
        const rejected: string[] = [];
        let files = 0;
        let folders = 0;
        const walk = async (directory: string, relative: string): Promise<void> => {
            for (const name of (await readdir(directory)).sort()) {
                const child = join(directory, name);
                const childPath = `${relative}/${name}`;
                const childInfo = await lstat(child);
                if (name.startsWith('.') || childInfo.isSymbolicLink()) rejected.push(childPath);
                else if (childInfo.isDirectory()) {
                    folders++;
                    entries.push({ path: childPath, type: 'directory' });
                    await walk(child, childPath);
                } else if (childInfo.isFile()) {
                    files++;
                    entries.push({ path: childPath, type: 'file' });
                }
                if (entries.length > MAX_OPERATION_ENTRIES) throw new PtbkError(`${path} has more than ${MAX_OPERATION_ENTRIES} entries; copy smaller parts.`, { kind: 'usage' });
            }
        };
        const name = path.split('/').pop()!;
        if (info.isDirectory()) {
            folders++;
            entries.push({ path: name, type: 'directory' });
            await walk(absolute, name);
        } else {
            files++;
            entries.push({ path: name, type: 'file' });
        }
        return { absolute, files, folders, rejected, entries };
    }

    /** Preflight of a deletion: the whole scope including hidden descendants; protected content rejects its parent. */
    private async preflightDelete(entries: readonly FileOperationEntry[]): Promise<ReviewItem[]> {
        const items: ReviewItem[] = [];
        const paths = [...new Set(entries.map((entry) => entry.path))];
        for (const path of paths) {
            // A descendant of another selected folder is covered by its parent.
            if (paths.some((other) => other !== path && path.startsWith(`${other}/`))) continue;
            const target = await this.writable(path, 'delete').catch((error: unknown) => error as Error);
            if (target instanceof Error) {
                items.push({ path, status: 'rejected', reason: errorMessage(target), files: 0, folders: 0 });
                continue;
            }
            if (!target.exists) {
                items.push({ path, status: 'rejected', reason: `${path} no longer exists.`, files: 0, folders: 0 });
                continue;
            }
            if (target.type !== 'directory') {
                const owner = target.type === 'file' ? this.host.ownerOf(target.absolute) : undefined;
                items.push(owner ? { path, status: 'rejected', reason: `${owner} owns ${path} now.`, files: 1, folders: 0 } : { path, status: 'ok', files: 1, folders: 0 });
                continue;
            }
            let files = 0;
            let folders = 1;
            let hidden = 0;
            let blocked: string | undefined;
            const walk = async (directory: string, relative: string): Promise<void> => {
                for (const name of await readdir(directory)) {
                    if (blocked) return;
                    const child = join(directory, name);
                    const childPath = `${relative}/${name}`;
                    const info = await lstat(child);
                    if (name.startsWith('.')) {
                        hidden++;
                        if (PROTECTED_NAME.test(name)) blocked = `${path} contains protected content (${childPath}).`;
                    }
                    const protection = name.startsWith('.') ? undefined : this.protection(childPath, 'delete');
                    if (protection) blocked = protection;
                    const owner = this.host.ownerOf(child);
                    if (owner) blocked = `${owner} owns ${childPath} now.`;
                    if (info.isDirectory() && !info.isSymbolicLink()) {
                        folders++;
                        await walk(child, childPath);
                    } else files++;
                }
            };
            await walk(target.absolute, path);
            items.push(blocked ? { path, status: 'rejected', reason: blocked, files, folders, hidden } : { path, status: 'ok', files, folders, ...(hidden ? { hidden } : {}) });
        }
        return items;
    }

    /**
     * Applies a reviewed operation with the chosen collision resolution (Keep Both by default). An import returns the
     * uploads the client sends next; a copy writes at once; a deletion needs the explicit confirmation of its scope and
     * is committed as its own operation.
     */
    public async apply(input: { readonly id: string; readonly choice?: CollisionChoice; readonly choices?: Readonly<Record<string, CollisionChoice>>; readonly confirm?: boolean }): Promise<FileOperationResult> {
        this.expireReviews();
        const pending = this.reviews.get(input.id);
        if (!pending) throw new PtbkError('This review expired or was already applied; review the operation again.', { kind: 'conflict' });
        this.reviews.delete(input.id);
        const { review } = pending;
        if (review.kind === 'delete') {
            if (input.confirm !== true) {
                this.reviews.set(input.id, pending);
                throw new PtbkError('Confirm the deletion and its scope first.', { kind: 'usage' });
            }
            return await this.applyDelete(review);
        }
        const choice = (name: string): CollisionChoice => input.choices?.[name] ?? input.choice ?? 'keep-both';
        return await this.mutex.run(async () => {
            const destination = review.destination ?? '';
            const destinationAbsolute = resolve(this.host.projectRoot, ...destination.split('/').filter(Boolean));
            const existing = await this.names(destinationAbsolute);
            const accepted: string[] = [];
            const skipped: string[] = [];
            const conflicting: Array<{ path: string; reason: string }> = [];
            const operation: Operation = { id: review.id, kind: review.kind, batch: '', plan: [], choice: input.choice ?? 'keep-both', startedAt: Date.now() };
            for (const item of review.items) {
                if (item.status === 'rejected' || !item.target) {
                    conflicting.push({ path: item.path, reason: item.reason ?? 'Not written.' });
                    continue;
                }
                const name = item.target.split('/').pop()!;
                const collision = existing.find((other) => sameName(other, name));
                const resolution = collision ? choice(item.path) : undefined;
                if (resolution === 'skip') {
                    skipped.push(item.path);
                    continue;
                }
                let targetName = name;
                if (collision && resolution === 'keep-both') targetName = this.keepBoth(name, existing);
                if (collision && resolution === 'replace') {
                    const protection = this.protection(destination ? `${destination}/${collision}` : collision, 'replace');
                    if (protection) {
                        conflicting.push({ path: item.path, reason: protection });
                        continue;
                    }
                    targetName = collision;
                }
                existing.push(targetName);
                const target = destination ? `${destination}/${targetName}` : targetName;
                const entries = review.kind === 'import' ? pending.entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.path === item.path || entry.path.startsWith(`${item.path}/`)) : (await this.copySource(item.path)).entries.map((entry, index) => ({ entry, index }));
                for (const { entry, index } of entries) {
                    const rest = entry.path.split('/').slice(1).join('/');
                    if (entry.path.split('/').some((segment) => segment.startsWith('.'))) continue;
                    if (review.kind === 'import' && typeof entry.size === 'number' && entry.size > MAX_IMPORT_FILE_BYTES) continue;
                    const childTarget = rest ? `${target}/${rest}` : target;
                    // Replacing merges into an existing folder; a file never replaces a folder (or the reverse).
                    const current = await lstat(resolve(this.host.projectRoot, ...childTarget.split('/'))).catch(() => undefined);
                    const type = entry.type === 'directory' ? 'directory' : 'file';
                    if (current && (current.isSymbolicLink() || current.isDirectory() !== (type === 'directory'))) {
                        conflicting.push({ path: `${item.path}${rest ? `/${rest}` : ''}`, reason: `${childTarget} exists as a different kind of entry.` });
                        continue;
                    }
                    const replaceProtection = current && type === 'file' ? this.protection(childTarget, 'replace') : undefined;
                    if (replaceProtection) {
                        conflicting.push({ path: `${item.path}${rest ? `/${rest}` : ''}`, reason: replaceProtection });
                        continue;
                    }
                    operation.plan.push({ index, target: childTarget, type, ...(review.kind === 'copy' ? { source: `${item.path.split('/').slice(0, -1).concat(entry.path).join('/')}` } : {}), ...(typeof entry.size === 'number' ? { size: entry.size } : {}) });
                }
                accepted.push(item.path);
            }
            const files = operation.plan.filter((item) => item.type === 'file').length;
            const folders = operation.plan.filter((item) => item.type === 'directory').length;
            if (!operation.plan.length) return { id: review.id, kind: review.kind, state: 'completed', accepted, skipped, conflicting, summary: 'Nothing was written.' };
            const batch = this.join(`${review.kind}:${destination}:${pending.view}`, review.kind, destination, { files, folders });
            batch.writing.push(operation.id);
            operation.batch = batch.id;
            this.journal.operations.push(operation);
            // Folders first, so the planned tree exists before files arrive.
            for (const item of operation.plan.filter((entry) => entry.type === 'directory')) {
                const absolute = resolve(this.host.projectRoot, ...item.target.split('/'));
                await mkdir(absolute, { recursive: true });
                item.done = null;
            }
            await this.save();
            this.host.onChange();
            if (review.kind === 'copy') {
                for (const item of operation.plan.filter((entry) => entry.type === 'file')) {
                    const source = resolve(this.host.projectRoot, ...item.source!.split('/'));
                    const absolute = resolve(this.host.projectRoot, ...item.target.split('/'));
                    await copyFile(source, absolute);
                    item.done = sha256(await readFile(absolute));
                }
                await this.finish(operation);
                return { id: review.id, kind: review.kind, state: 'completed', accepted, skipped, conflicting, summary: `Copied ${count(files, 'file')} into ${destination || 'the project root'}.` };
            }
            return {
                id: review.id,
                kind: review.kind,
                state: 'writing',
                accepted,
                skipped,
                conflicting,
                uploads: operation.plan.filter((item) => item.type === 'file').map((item) => ({ index: item.index, target: item.target })),
                summary: `Importing ${count(files, 'file')} into ${destination || 'the project root'}.`,
            };
        });
    }

    /**
     * Writes one uploaded file of an applied import (streamed to a temporary file, then moved into place atomically).
     * The source on the client's disk is only read.
     */
    public async upload(id: string, index: number, body: Readable): Promise<{ readonly target: string; readonly revision: string }> {
        const operation = this.journal.operations.find((item) => item.id === id);
        const item = operation?.plan.find((entry) => entry.index === index && entry.type === 'file');
        if (!operation || !item) throw new PtbkError('This upload is not part of an applied import.', { kind: 'not-found' });
        if (item.done !== undefined) throw new PtbkError(`${item.target} was already written.`, { kind: 'conflict' });
        const directory = join(this.host.temporaryDirectory, 'desktop-files', id);
        await mkdir(directory, { recursive: true });
        const temporary = join(directory, String(index));
        const hash = createHash('sha256');
        let size = 0;
        const measure = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
                size += chunk.length;
                if (size > MAX_IMPORT_FILE_BYTES) return callback(new PtbkError(`${item.target} is larger than the import limit.`, { kind: 'usage' }));
                hash.update(chunk);
                callback(null, chunk);
            },
        });
        await pipeline(body, measure, createWriteStream(temporary));
        return await this.mutex.run(async () => {
            const target = await this.writable(item.target, operation.choice === 'replace' ? 'replace' : 'write');
            if (target.type === 'directory') throw new PtbkError(`${item.target} is a folder now.`, { kind: 'conflict' });
            await mkdir(dirname(target.absolute), { recursive: true });
            await rename(temporary, target.absolute);
            item.done = hash.digest('hex');
            await this.save();
            return { target: item.target, revision: item.done };
        });
    }

    /**
     * Completes an import: every written item joins its batch; items that never arrived are reported and the
     * operation waits for review instead of being committed as if complete.
     */
    public async complete(id: string): Promise<FileOperationResult> {
        return await this.mutex.run(async () => {
            const operation = this.journal.operations.find((item) => item.id === id);
            if (!operation) throw new PtbkError('This import is not in progress.', { kind: 'not-found' });
            const missing = operation.plan.filter((item) => item.type === 'file' && item.done === undefined);
            await this.finish(operation, missing.map((item) => item.target));
            const written = operation.plan.filter((item) => item.type === 'file' && item.done !== undefined).length;
            await rm(join(this.host.temporaryDirectory, 'desktop-files', id), { recursive: true, force: true }).catch(() => undefined);
            return {
                id,
                kind: operation.kind,
                state: missing.length ? 'interrupted' : 'completed',
                accepted: operation.plan.filter((item) => item.done !== undefined).map((item) => item.target),
                skipped: [],
                conflicting: missing.map((item) => ({ path: item.target, reason: 'Not received.' })),
                summary: missing.length ? `Imported ${count(written, 'file')}; ${count(missing.length, 'file')} did not arrive and the import waits for review.` : `Imported ${count(written, 'file')}.`,
            };
        });
    }

    /** Ends a writing operation: its written items join the batch (missing ones put the batch in review). */
    private async finish(operation: Operation, missing: readonly string[] = []): Promise<void> {
        const batch = this.journal.batches.find((item) => item.id === operation.batch);
        this.journal.operations = this.journal.operations.filter((item) => item.id !== operation.id);
        if (batch) {
            batch.writing = batch.writing.filter((item) => item !== operation.id);
            const written: string[] = [];
            for (const item of operation.plan) {
                // Folders are recorded through their files; an empty folder is not versioned by Git.
                if (item.type !== 'file' || typeof item.done !== 'string') continue;
                batch.paths[item.target] = item.done;
                written.push(resolve(this.host.projectRoot, ...item.target.split('/')));
            }
            this.host.reserve(written, true);
            batch.lastAt = Date.now();
            if (missing.length) {
                batch.state = 'review';
                batch.reason = `Interrupted: ${count(missing.length, 'file')} did not arrive (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''}). Commit the applied items or dismiss to keep them uncommitted.`;
            }
        }
        await this.save();
        this.arm();
        this.host.onChange();
    }

    /** Deletes a confirmed scope and commits it as its own operation. */
    private async applyDelete(review: FileOperationReview): Promise<FileOperationResult> {
        const outcome = await this.mutex.run(async () => {
            const accepted: string[] = [];
            const conflicting: Array<{ path: string; reason: string }> = [];
            // The scope is checked again: something may have changed since the review.
            const current = await this.preflightDelete(review.items.filter((item) => item.status === 'ok').map((item) => ({ path: item.path })));
            const paths: Record<string, null> = {};
            let files = 0;
            let folders = 0;
            for (const item of review.items.filter((entry) => entry.status === 'rejected')) conflicting.push({ path: item.path, reason: item.reason ?? 'Not deleted.' });
            for (const item of current) {
                const reviewed = review.items.find((entry) => entry.path === item.path);
                if (item.status !== 'ok' || !reviewed || item.files !== reviewed.files || item.folders !== reviewed.folders) {
                    conflicting.push({ path: item.path, reason: item.status !== 'ok' ? (item.reason ?? 'Not deleted.') : 'Its contents changed since the review; review the deletion again.' });
                    continue;
                }
                const absolute = resolve(this.host.projectRoot, ...item.path.split('/'));
                // Git versions files, not folders: the commit removes exactly the tracked files of the scope.
                const tracked = (await git(this.host.projectRoot, ['ls-files', '-z', '--full-name', '--', item.path], { literal: true })).stdout.split('\0').filter(Boolean);
                const prefix = (await git(this.host.projectRoot, ['rev-parse', '--show-prefix'])).stdout.trim();
                await rm(absolute, { recursive: true, force: true });
                for (const file of tracked) if (file.startsWith(prefix)) paths[file.slice(prefix.length)] = null;
                accepted.push(item.path);
                files += item.files;
                folders += item.folders;
            }
            if (!accepted.length) return { accepted, conflicting, batch: undefined };
            const batch = this.join(`delete:${review.id}`, 'delete', undefined, { files, folders });
            Object.assign(batch.paths, paths);
            batch.selection = accepted;
            this.host.reserve(this.absolutes(batch), true);
            await this.save();
            return { accepted, conflicting, batch };
        });
        // A deletion is a distinct confirmed operation with its own commit, made at once.
        if (outcome.batch) await this.flush(outcome.batch.id);
        this.host.onChange();
        return {
            id: review.id,
            kind: 'delete',
            state: 'completed',
            accepted: outcome.accepted,
            skipped: [],
            conflicting: outcome.conflicting,
            summary: outcome.accepted.length ? `Deleted ${count(outcome.accepted.length, 'item')}${outcome.conflicting.length ? `; ${count(outcome.conflicting.length, 'item')} were not deleted` : ''}.` : 'Nothing was deleted.',
        };
    }

    // ── Batching and commits ─────────────────────────────────────────────────

    /** Finds (or opens) the compatible pending batch of a change. */
    private join(key: string, kind: Batch['kind'], destination: string | undefined, counts: { readonly files: number; readonly folders: number }): Batch {
        const now = Date.now();
        let batch = this.journal.batches.find((item) => item.key === key && item.state === 'pending');
        if (!batch) {
            batch = { id: randomUUID(), key, kind, ...(destination !== undefined ? { destination } : {}), paths: {}, files: 0, folders: 0, firstAt: now, lastAt: now, writing: [], state: 'pending' };
            this.journal.batches.push(batch);
        }
        batch.files += counts.files;
        batch.folders += counts.folders;
        batch.lastAt = now;
        return batch;
    }

    /** Records an accepted text change in its batch (or reports why it is not committed). */
    private async accept(key: string, kind: Batch['kind'], paths: Record<string, string | null>, counts: { readonly files: number; readonly folders: number }): Promise<'pending' | 'uncommitted' | 'ignored'> {
        const absolute = Object.keys(paths).map((path) => resolve(this.host.projectRoot, ...path.split('/')));
        if (!this.host.commitMode()) return 'uncommitted';
        if ((await ignoredPaths(this.host.projectRoot, absolute).catch(() => new Set<string>())).size === absolute.length) return 'ignored';
        const existing = this.journal.batches.find((item) => item.key === key && item.state === 'pending');
        const batch = this.join(key, kind, undefined, existing ? { files: 0, folders: 0 } : counts);
        Object.assign(batch.paths, paths);
        this.host.reserve(absolute, true);
        await this.save();
        this.arm();
        this.host.onChange();
        return 'pending';
    }

    /** The commit subject of a batch (prefixed with `ptbk: ` by the commit). */
    private subject(batch: Batch): string {
        // The files actually written (an interrupted import names only what it applied).
        const files = Object.keys(batch.paths).length || batch.files;
        const into = batch.destination ? `into ${batch.destination}` : 'into the project root';
        if (batch.kind === 'save') return `Edit ${Object.keys(batch.paths)[0] ?? 'file'}`;
        if (batch.kind === 'import') return `Import ${count(files, 'file')} ${into}`;
        if (batch.kind === 'copy') return `Copy ${count(files, 'file')} ${into}`;
        const selection = batch.selection ?? Object.keys(batch.paths);
        return selection.length === 1 ? `Delete ${selection[0]}` : `Delete ${count(selection.length, 'item')}${batch.files ? ` (${count(batch.files, 'file')})` : ''}`;
    }

    /** Re-arms the batch timer for the next due batch. */
    private arm(): void {
        clearTimeout(this.timer);
        if (this.disposed) return;
        const now = Date.now();
        const due = this.journal.batches
            .map((batch) => (batch.state === 'pending' && !batch.writing.length ? Math.min(batch.lastAt + this.quietMs, batch.firstAt + this.maxAgeMs) : batch.state === 'failed' ? (batch.retryAt ?? now + RETRY_MS) : undefined))
            .filter((value): value is number => value !== undefined);
        if (!due.length) return;
        this.timer = setTimeout(() => void this.flushDue(), Math.max(0, Math.min(...due) - now));
        this.timer.unref();
    }

    /** Commits every due batch. */
    private async flushDue(): Promise<void> {
        const now = Date.now();
        for (const batch of [...this.journal.batches]) {
            const due = batch.state === 'pending' && !batch.writing.length && (now >= batch.lastAt + this.quietMs || now >= batch.firstAt + this.maxAgeMs);
            const retry = batch.state === 'failed' && now >= (batch.retryAt ?? 0);
            if (due || retry) await this.flush(batch.id).catch(() => undefined);
        }
        this.arm();
    }

    /**
     * Commits batches now (**Commit now**; also before a competing write or integration and at a graceful stop). The
     * accepted content is verified first: a path a task owns now or that changed after acceptance is never committed
     * as the accepted version; the batch is blocked with its cause and the working copy is preserved.
     */
    public async flush(id?: string): Promise<string[]> {
        const commits: string[] = [];
        // Without an id (a graceful stop, a due timer): pending and failed batches; blocked and interrupted ones wait for the user.
        const batches = this.journal.batches.filter((batch) => !batch.writing.length && batch.state !== 'committing' && (id ? batch.id === id : batch.state === 'pending' || batch.state === 'failed'));
        for (const batch of batches) {
            const sha = await this.commitBatch(batch);
            if (sha) commits.push(sha);
        }
        this.arm();
        this.host.onChange();
        return commits;
    }

    /** Flushes the batches touching any of the given absolute paths (before a competing write or integration). */
    public async flushPaths(absolutePaths: readonly string[]): Promise<void> {
        const paths = absolutePaths.map((path) => this.relative(path)).filter((path): path is string => path !== undefined);
        const touched = this.journal.batches.filter((batch) => batch.state === 'pending' && !batch.writing.length && Object.keys(batch.paths).some((candidate) => paths.some((path) => path === candidate || path.startsWith(`${candidate}/`) || candidate.startsWith(`${path}/`))));
        for (const batch of touched) await this.commitBatch(batch);
        if (touched.length) {
            this.arm();
            this.host.onChange();
        }
    }

    /** Verifies and commits one batch. */
    private async commitBatch(batch: Batch): Promise<string | undefined> {
        if (batch.state === 'committing' || !this.journal.batches.includes(batch)) return undefined;
        const subject = this.subject(batch);
        if (!this.host.commitMode()) {
            await this.end(batch, { subject, at: new Date().toISOString(), outcome: 'uncommitted', detail: 'The project uses an explicit no-commit workflow; the files are saved.' });
            return undefined;
        }
        batch.state = 'committing';
        this.host.onChange();
        try {
            const verified: string[] = [];
            const blocked: string[] = [];
            for (const [path, accepted] of Object.entries(batch.paths)) {
                const absolute = resolve(this.host.projectRoot, ...path.split('/'));
                const owner = this.host.ownerOf(absolute);
                const current = await currentContent(absolute);
                if (owner) blocked.push(`${path} (${owner} owns it now)`);
                else if (current !== accepted) blocked.push(`${path} (changed after it was saved)`);
                else verified.push(absolute);
            }
            const ignored = await ignoredPaths(this.host.projectRoot, verified).catch(() => new Set<string>());
            const committable = verified.filter((path) => !ignored.has(path));
            const sha = committable.length ? await this.host.commit(committable, subject, DESKTOP_OPERATION_TRAILER) : undefined;
            if (blocked.length) {
                // The verified part is committed; the rest is preserved as it is now and reported.
                for (const path of verified) delete batch.paths[this.relative(path)!];
                this.host.reserve(verified, false);
                batch.state = 'blocked';
                batch.reason = `Not committed: ${blocked.slice(0, 5).join(', ')}${blocked.length > 5 ? ', …' : ''}. Both versions are preserved: the current file stays in the working tree. Review it, then Commit now or Dismiss.`;
                if (sha) this.record({ subject, at: new Date().toISOString(), outcome: 'committed', sha });
                await this.save();
                this.host.log(`Promptbook Desktop: "${subject}" is blocked: ${batch.reason}`, 'warning');
                return sha;
            }
            const at = new Date().toISOString();
            await this.end(batch, sha ? { subject, at, outcome: 'committed', sha } : verified.length && !committable.length ? { subject, at, outcome: 'ignored', detail: 'Ignored by the project’s Git rules.' } : { subject, at, outcome: 'committed', detail: 'No change remained to commit.' });
            return sha;
        } catch (error) {
            batch.state = 'failed';
            batch.reason = `The commit failed: ${errorMessage(error)}. The files are saved; only the commit is retried.`;
            batch.retryAt = Date.now() + RETRY_MS;
            await this.save().catch(() => undefined);
            this.host.log(`Promptbook Desktop: "${subject}" is saved but not committed yet: ${errorMessage(error)}`, 'warning');
            return undefined;
        }
    }

    /** Ends a batch with its outcome. */
    private async end(batch: Batch, outcome: DesktopFilesView['recent'][number]): Promise<void> {
        this.journal.batches = this.journal.batches.filter((item) => item.id !== batch.id);
        this.host.reserve(this.absolutes(batch), false);
        this.record(outcome);
        await this.save();
    }

    /** Remembers a recent outcome for the Files view. */
    private record(outcome: DesktopFilesView['recent'][number]): void {
        this.journal.recent = [outcome, ...this.journal.recent].slice(0, RECENT_OUTCOMES);
    }

    /**
     * Stops tracking a blocked, failed or interrupted batch: its files stay as they are in the working tree, without a
     * commit (nothing is reverted).
     */
    public async dismiss(id: string): Promise<DesktopFilesView> {
        await this.mutex.run(async () => {
            const batch = this.journal.batches.find((item) => item.id === id);
            if (!batch) throw new PtbkError('This batch is no longer pending.', { kind: 'not-found' });
            if (batch.state === 'pending' || batch.state === 'committing' || batch.writing.length) throw new PtbkError('A pending batch is committed, not dismissed; use Commit now.', { kind: 'usage' });
            await this.end(batch, { subject: this.subject(batch), at: new Date().toISOString(), outcome: 'dismissed', detail: 'Kept in the working tree without a commit.' });
        });
        this.arm();
        this.host.onChange();
        return this.view();
    }

    /** Whether the journal was loaded (operations are refused before recovery). */
    public get ready(): boolean {
        return this.loaded;
    }
}
