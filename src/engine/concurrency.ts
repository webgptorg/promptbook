import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * The shared capacity of one engine: active background tasks and chat turns **together** (not per kind or agent).
 * The limit is read live, so raising it opens slots at once and lowering it only prevents new claims (active work is
 * never killed). Chat turns wait in a FIFO queue for a free slot; the scheduler claims background work only with a
 * free slot and no waiting chat turn, so interactive turns are never starved by a busy queue.
 *
 * @private concurrent work
 */
export class WorkCapacity {
    private active = 0;
    private readonly waiting: Array<{ readonly resolve: () => void; readonly label: string }> = [];

    public constructor(private readonly limit: () => number) {}

    /** The configured limit right now (at least one). */
    public get size(): number {
        return Math.max(1, Math.floor(this.limit()) || 1);
    }

    /** Units holding a slot. */
    public get used(): number {
        return this.active;
    }

    /** Labels of units waiting for a slot, in order. */
    public get queued(): readonly string[] {
        return this.waiting.map((entry) => entry.label);
    }

    /** Whether a background claim may take a slot now (a waiting chat turn goes first). */
    public get claimable(): boolean {
        return this.active < this.size && !this.waiting.length;
    }

    /** Takes a slot when one is free, without waiting. */
    public tryAcquire(): boolean {
        if (!this.claimable) return false;
        this.active++;
        return true;
    }

    /** Waits (FIFO) for a slot; `signal` withdraws the wait. */
    public async acquire(label: string, signal?: AbortSignal): Promise<void> {
        if (this.active < this.size && !this.waiting.length) {
            this.active++;
            return;
        }
        await new Promise<void>((resolvePromise, reject) => {
            const entry = { label, resolve: resolvePromise };
            this.waiting.push(entry);
            signal?.addEventListener(
                'abort',
                () => {
                    const index = this.waiting.indexOf(entry);
                    if (index >= 0) this.waiting.splice(index, 1);
                    reject(signal.reason instanceof Error ? signal.reason : new Error('The wait for a free slot was cancelled.'));
                },
                { once: true },
            );
        });
    }

    /** Returns a slot and hands it to the next waiting unit. */
    public release(): void {
        this.active = Math.max(0, this.active - 1);
        this.drain();
    }

    /** Hands free slots to waiting units (also after the limit was raised). */
    public drain(): void {
        while (this.waiting.length && this.active < this.size) {
            this.active++;
            this.waiting.shift()!.resolve();
        }
    }
}

/**
 * The current owner of one file.
 *
 * @private concurrent work
 */
export type FileOwner = {
    /** Owning unit (the run identifier of a task, `chat:<name>` of a chat turn, `engine` for short engine writes). */
    readonly owner: string;
    /** Human label of the owner (task or chat name). */
    readonly label: string;
};

/**
 * A file another owner holds.
 *
 * @private concurrent work
 */
export type FileConflict = FileOwner & { readonly path: string };

/**
 * Per-file mutation ownership in the project's one working tree. Different files can be changed concurrently; work
 * on a file another unit owns waits until it is released (all-or-nothing, so a waiter never holds part of its set).
 * Identity is the project-relative path after resolving symbolic links, case-folded on case-insensitive file systems.
 * Read-only inspection needs no ownership. File-lock deadlocks (two owners waiting for each other's files) are a known,
 * deferred limitation: waits are visible and bounded by their callers, never broken automatically.
 *
 * @private concurrent work
 */
export class FileOwnership {
    private readonly owners = new Map<string, FileOwner & { readonly path: string }>();
    private readonly waiters = new Set<() => void>();
    private readonly rootReal: string;
    private readonly caseInsensitive: boolean;

    public constructor(
        private readonly root: string,
        options: { readonly onChange?: () => void; readonly caseInsensitive?: boolean } = {},
    ) {
        this.rootReal = realOrSelf(root);
        this.caseInsensitive = options.caseInsensitive ?? (process.platform === 'darwin' || process.platform === 'win32');
        this.onChange = options.onChange;
    }

    private readonly onChange?: () => void;

    /** The project-relative POSIX path of a file (aliases through symbolic links resolve to the same identity). */
    public relativePath(path: string): string {
        const absolute = isAbsolute(path) ? path : resolve(this.root, path);
        // The file may not exist yet: resolve its nearest existing directory instead.
        const real = realOrSelf(absolute) !== absolute ? realOrSelf(absolute) : resolve(realOrSelf(dirname(absolute)), basename(absolute));
        const fromReal = relative(this.rootReal, real);
        const relativePath = fromReal.startsWith('..') || isAbsolute(fromReal) ? relative(this.root, absolute) : fromReal;
        return relativePath.split(sep).join('/');
    }

    /** The identity key of a file. */
    private key(path: string): string {
        const relativePath = this.relativePath(path);
        return this.caseInsensitive ? relativePath.toLowerCase() : relativePath;
    }

    /** The owner of a file, if any. */
    public ownerOf(path: string): FileOwner | undefined {
        const entry = this.owners.get(this.key(path));
        return entry ? { owner: entry.owner, label: entry.label } : undefined;
    }

    /** Files of `paths` held by owners other than `owner`. */
    public conflicts(owner: string, paths: readonly string[]): FileConflict[] {
        const conflicts: FileConflict[] = [];
        for (const path of paths) {
            const entry = this.owners.get(this.key(path));
            if (entry && entry.owner !== owner) conflicts.push({ path: entry.path, owner: entry.owner, label: entry.label });
        }
        return conflicts;
    }

    /** Takes every file of `paths` at once, or none when another owner holds one of them. */
    public tryAcquire(owner: string, label: string, paths: readonly string[]): { readonly ok: true } | { readonly ok: false; readonly conflicts: readonly FileConflict[] } {
        const conflicts = this.conflicts(owner, paths);
        if (conflicts.length) return { ok: false, conflicts };
        let changed = false;
        for (const path of paths) {
            const key = this.key(path);
            if (this.owners.get(key)?.owner === owner) continue;
            this.owners.set(key, { owner, label, path: this.relativePath(path) });
            changed = true;
        }
        if (changed) this.onChange?.();
        return { ok: true };
    }

    /**
     * Waits until every file of `paths` can be taken together, then takes them. `onWait` reports the current blockers
     * (once per change); `signal` or `timeoutMs` end the wait with the remaining conflicts.
     */
    public async acquire(
        owner: string,
        label: string,
        paths: readonly string[],
        options: { readonly signal?: AbortSignal; readonly timeoutMs?: number; readonly onWait?: (conflicts: readonly FileConflict[]) => void } = {},
    ): Promise<{ readonly ok: true } | { readonly ok: false; readonly conflicts: readonly FileConflict[] }> {
        const deadline = options.timeoutMs !== undefined ? Date.now() + options.timeoutMs : undefined;
        let reported = '';
        for (;;) {
            const attempt = this.tryAcquire(owner, label, paths);
            if (attempt.ok || options.signal?.aborted || (deadline !== undefined && Date.now() >= deadline)) return attempt;
            const summary = attempt.conflicts.map((conflict) => `${conflict.path}\u0000${conflict.owner}`).join('\n');
            if (summary !== reported) {
                reported = summary;
                options.onWait?.(attempt.conflicts);
            }
            await new Promise<void>((resolvePromise) => {
                const wake = (): void => {
                    clearTimeout(timer);
                    this.waiters.delete(wake);
                    options.signal?.removeEventListener('abort', wake);
                    resolvePromise();
                };
                const timer = setTimeout(wake, deadline !== undefined ? Math.max(0, Math.min(deadline - Date.now(), 60_000)) : 60_000);
                this.waiters.add(wake);
                options.signal?.addEventListener('abort', wake, { once: true });
            });
        }
    }

    /** Releases some (or all) files of an owner and wakes the waiters. */
    public release(owner: string, paths?: readonly string[]): void {
        const keys = paths ? new Set(paths.map((path) => this.key(path))) : undefined;
        let changed = false;
        for (const [key, entry] of this.owners) {
            if (entry.owner !== owner || (keys && !keys.has(key))) continue;
            this.owners.delete(key);
            changed = true;
        }
        if (!changed) return;
        for (const wake of [...this.waiters]) wake();
        this.onChange?.();
    }

    /** Project-relative files an owner holds. */
    public owned(owner: string): string[] {
        return [...this.owners.values()].filter((entry) => entry.owner === owner).map((entry) => entry.path);
    }

    /** Absolute paths held by every owner except `owner` (excluded from that owner's change attribution). */
    public heldByOthers(owner: string | undefined): Set<string> {
        return new Set([...this.owners.values()].filter((entry) => entry.owner !== owner).map((entry) => resolve(this.root, entry.path)));
    }

    /** Every held file with its owner (for views and recovery records). */
    public entries(): Array<FileConflict> {
        return [...this.owners.values()].map((entry) => ({ path: entry.path, owner: entry.owner, label: entry.label }));
    }
}

/**
 * The real path of an existing file, or the path itself.
 */
function realOrSelf(path: string): string {
    try {
        return realpathSync.native(path);
    } catch {
        return path;
    }
}

/**
 * Turn windows that ended longer ago than this (six hours) are forgotten.
 */
const WINDOW_RETENTION_MS = 21_600_000;

/**
 * Turn windows kept per owner.
 */
const WINDOWS_PER_OWNER = 50;

/**
 * Tolerance between a file's modification time and a turn's recorded start/end.
 */
const WINDOW_SLACK_MS = 2_000;

/**
 * Harness-turn windows of active units, used to attribute a changed file nobody claimed: it belongs to a unit only
 * when that unit's turn is the one that was running when the file was last modified (or when no other unit's turn
 * overlapped at all). Ambiguous changes are never attributed: they stay unowned and visible instead of being committed
 * with the wrong work.
 *
 * @private concurrent work
 */
export class TurnWindows {
    private readonly windows = new Map<string, Array<{ start: number; end?: number }>>();

    /** A unit's harness turn started (windows that ended long ago are forgotten). */
    public begin(owner: string, at = Date.now()): void {
        for (const [unit, list] of this.windows) if (list.every((window) => window.end !== undefined && window.end < at - WINDOW_RETENTION_MS)) this.windows.delete(unit);
        const list = this.windows.get(owner) ?? [];
        list.push({ start: at });
        this.windows.set(owner, list.slice(-WINDOWS_PER_OWNER));
    }

    /** The unit's current harness turn ended. */
    public end(owner: string, at = Date.now()): void {
        const open = [...(this.windows.get(owner) ?? [])].reverse().find((window) => window.end === undefined);
        if (open) open.end = at;
    }

    /** Forgets a finished unit. */
    public forget(owner: string): void {
        this.windows.delete(owner);
    }

    /**
     * Whether a changed file (last modified at `modifiedAt`, unknown for a deletion) can be attributed to `owner`, whose
     * work started at `since`: no other unit's turn overlapped this owner's work, or only this owner's turn covers the
     * modification time.
     */
    public attributable(owner: string, since: number, modifiedAt: number | undefined, now = Date.now()): boolean {
        const covers = (window: { start: number; end?: number }, at: number): boolean => window.start - WINDOW_SLACK_MS <= at && (window.end ?? now) + WINDOW_SLACK_MS >= at;
        const others = [...this.windows.entries()].filter(([unit]) => unit !== owner).flatMap(([, list]) => list).filter((window) => (window.end ?? now) >= since);
        if (!others.length) return true;
        if (modifiedAt === undefined) return false;
        const mine = (this.windows.get(owner) ?? []).some((window) => covers(window, modifiedAt));
        return mine && !others.some((window) => covers(window, modifiedAt));
    }
}
