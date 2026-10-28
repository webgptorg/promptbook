import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseReferenceValue } from '../book/references.js';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, toProjectRelative, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { agentSubject, gitStatus, readAtHead } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { parseChatBook } from './chat-book.js';

/**
 * Commit trailers of a batch (several values per key are kept in order, e.g. every Task-Name a message relates to).
 *
 * @private chats
 */
export type BatchTrailers = Readonly<Record<string, string | readonly string[] | undefined>>;

/**
 * One chat's saved but not yet committed changes (persisted, so a force stop never loses or misattributes them).
 */
type PendingBatch = {
    /** Chat name (the batch commit's `Chat-Name`). */
    readonly chat: string;
    /** Project-relative files of the batch (the chat Book and message attachments), in first-write order. */
    readonly paths: readonly string[];
    /** Accumulated trailers. */
    readonly trailers: Readonly<Record<string, readonly string[]>>;
    /** First saved write of the batch (epoch ms; bounds the debounce). */
    readonly firstAt: number;
    /** Latest saved write (epoch ms). */
    readonly lastAt: number;
    /** Why the last commit attempt failed (the batch stays pending and is retried). */
    readonly failure?: string;
};

/**
 * Persistence state of one chat as clients show it.
 *
 * @private chats
 */
export type BatchView = { readonly chat: string; readonly since: string; readonly failure?: string };

/**
 * Smart, bounded batching of chat commits: every accepted message is saved to its Book at once (usable immediately),
 * and compatible saves of one chat share one scoped `ptbk: Chat - <name>` commit with `Chat-Name` and the union of the
 * other trailers. A batch is committed after a quiet period, at the latest after a bounded age (continuous activity
 * never postpones it indefinitely), and on explicit flushes (graceful shutdown, the end of a CLI operation). Pending
 * batches are recorded in `.ptbk/state/chat-batches.json`, so after a crash or force stop the saved files are committed
 * by the next engine instead of looking like someone else's edits. A failed commit keeps the batch pending and retries;
 * it never repeats the conversation.
 *
 * @private chats
 */
export class ChatCommitBatcher {
    private readonly batches = new Map<string, PendingBatch>();
    private readonly mutex = new Mutex();
    private timer?: NodeJS.Timeout;
    private loaded = false;
    private disposed = false;

    public constructor(
        private readonly project: Project,
        private readonly options: {
            /** Git working tree root (to skip files committed meanwhile). */
            readonly repositoryRoot: () => string | undefined;
            /** Commits exactly these absolute paths as one scoped operation (undefined when nothing changed). */
            readonly commit: (paths: readonly string[], subject: string, trailers: BatchTrailers) => Promise<string | undefined>;
            /** Quiet period after the latest write; omitted: commits only on explicit flushes. */
            readonly quietMs?: number;
            /** Longest time a batch stays pending while writes continue. */
            readonly maxAgeMs?: number;
            /** Retry interval after a failed commit. */
            readonly retryMs?: number;
            /** Absolute paths become pending (true) or committed/abandoned (false): they are engine-authored meanwhile. */
            readonly onPending?: (paths: readonly string[], pending: boolean) => void;
            readonly onChange?: () => void;
            readonly log?: (text: string, level: 'info' | 'warning') => void;
        },
    ) {}

    /** The persisted pending batches. */
    private get file(): string {
        return join(this.project.runtime.state, 'chat-batches.json');
    }

    /** Loads persisted batches once (an earlier process's pending saves). */
    private async load(): Promise<void> {
        if (this.loaded) return;
        this.loaded = true;
        const saved = (await readJsonIfExists<Record<string, PendingBatch>>(this.file).catch(() => undefined)) ?? {};
        for (const [key, batch] of Object.entries(saved)) {
            if (this.batches.has(key)) continue;
            this.batches.set(key, batch);
            this.options.onPending?.(batch.paths.map((path) => resolve(this.project.root, path)), true);
        }
    }

    /** Persists the pending batches. */
    private async save(): Promise<void> {
        await ensureDirectory(this.project.runtime.state);
        await writeJsonAtomic(this.file, Object.fromEntries(this.batches));
    }

    /**
     * Records a saved write of a chat for its batched commit and (re)arms the debounce. The file is already written:
     * the message is usable now; only its commit is pending.
     */
    public async schedule(chat: string, paths: readonly string[], trailers: BatchTrailers = {}): Promise<void> {
        await this.mutex.run(async () => {
            await this.load();
            const key = chat;
            const now = Date.now();
            const previous = this.batches.get(key);
            const relative = paths.map((path) => toProjectRelative(this.project.root, path));
            const merged: Record<string, string[]> = Object.fromEntries(Object.entries(previous?.trailers ?? {}).map(([name, values]) => [name, [...values]]));
            for (const [name, value] of Object.entries(trailers)) {
                const values = value === undefined ? [] : typeof value === 'string' ? [value] : [...value];
                merged[name] = [...new Set([...(merged[name] ?? []), ...values])];
            }
            this.batches.set(key, { chat, paths: [...new Set([...(previous?.paths ?? []), ...relative])], trailers: merged, firstAt: previous?.firstAt ?? now, lastAt: now, failure: previous?.failure });
            this.options.onPending?.(paths.map((path) => resolve(this.project.root, path)), true);
            await this.save();
        });
        this.arm();
        this.options.onChange?.();
    }

    /** Arms the timer for the next due batch. */
    private arm(): void {
        if (this.disposed || this.options.quietMs === undefined) return;
        clearTimeout(this.timer);
        const due = [...this.batches.values()].map((batch) => this.dueAt(batch));
        if (!due.length) return;
        const next = Math.min(...due);
        this.timer = setTimeout(() => void this.flushDue(), Math.max(0, next - Date.now()));
        this.timer.unref?.();
    }

    /** When a batch is due: after the quiet period, at the latest after the maximal age, or at its retry time. */
    private dueAt(batch: PendingBatch): number {
        if (batch.failure) return batch.lastAt + (this.options.retryMs ?? 60_000);
        const quiet = batch.lastAt + (this.options.quietMs ?? 0);
        return this.options.maxAgeMs === undefined ? quiet : Math.min(quiet, batch.firstAt + this.options.maxAgeMs);
    }

    /** Commits every due batch. */
    private async flushDue(): Promise<void> {
        const now = Date.now();
        for (const batch of [...this.batches.values()]) if (this.dueAt(batch) <= now) await this.flush(batch.chat);
        this.arm();
    }

    /**
     * Commits pending batches now (one chat, or all). Files that are no longer changed (committed meanwhile) end their
     * batch without a commit. Returns the created commits; a failure keeps its batch pending.
     */
    public async flush(chat?: string): Promise<string[]> {
        const commits: string[] = [];
        await this.mutex.run(async () => {
            await this.load();
            for (const batch of [...this.batches.values()]) {
                if (chat !== undefined && batch.chat !== chat) continue;
                const absolute = batch.paths.map((path) => resolve(this.project.root, path));
                try {
                    const root = this.options.repositoryRoot();
                    const dirty = root ? new Set((await gitStatus(this.project.root, root)).map((entry) => entry.path)) : undefined;
                    const changed = dirty ? absolute.filter((path) => dirty.has(path)) : absolute;
                    const agent = root && changed.length ? await batchAgent(root, absolute[0]!).catch(() => undefined) : undefined;
                    const sha = changed.length ? await this.options.commit(changed, agentSubject(agent, `Chat - ${batch.chat}`), { 'Chat-Name': batch.chat, ...batch.trailers }) : undefined;
                    if (sha) commits.push(sha);
                    this.batches.delete(batch.chat);
                    this.options.onPending?.(absolute, false);
                } catch (error) {
                    const failure = errorMessage(error);
                    if (batch.failure !== failure) this.options.log?.(`The saved messages of {${batch.chat}} are not committed yet: ${failure}. They stay saved and are retried.`, 'warning');
                    this.batches.set(batch.chat, { ...batch, failure, lastAt: Date.now() });
                }
            }
            await this.save();
        });
        this.arm();
        this.options.onChange?.();
        return commits;
    }

    /** Commits what an earlier process saved but could not commit (crash, force stop, interrupted CLI). */
    public async recover(): Promise<string[]> {
        await this.mutex.run(async () => await this.load());
        return this.batches.size ? await this.flush() : [];
    }

    /** Pending (or failing) batches, for status views. */
    public views(): BatchView[] {
        return [...this.batches.values()].map((batch) => ({ chat: batch.chat, since: new Date(batch.firstAt).toISOString(), ...(batch.failure ? { failure: batch.failure } : {}) }));
    }

    /** Whether a chat has saved but uncommitted writes. */
    public pending(chat: string): BatchView | undefined {
        return this.views().find((view) => view.chat === chat);
    }

    /** Stops the timer (pending batches stay recorded for the next flush or process). */
    public dispose(): void {
        this.disposed = true;
        clearTimeout(this.timer);
    }
}

/**
 * The one agent whose messages a pending chat batch adds (compared with the committed Book), so the batch commit
 * names the agent actually responsible. A batch with only User messages, or with several replying agents, has none:
 * the Book keeps every message's actual author either way.
 *
 * @private chats
 */
export async function batchAgent(repositoryRoot: string, chatPath: string): Promise<string | undefined> {
    const current = parseChatBook(await readFile(chatPath, 'utf8'));
    const committedSource = await readAtHead(repositoryRoot, chatPath);
    const committed = new Set((committedSource === undefined ? [] : parseChatBook(committedSource).messages).map((message) => `${message.senderKey}\0${message.at}\0${message.phase ?? ''}\0${message.text}`));
    const authors = new Map<string, string>();
    for (const message of current.messages) {
        if (message.senderKey === 'user' || committed.has(`${message.senderKey}\0${message.at}\0${message.phase ?? ''}\0${message.text}`)) continue;
        authors.set(message.senderKey, parseReferenceValue(message.sender)?.name ?? message.sender);
    }
    return authors.size === 1 ? [...authors.values()][0] : undefined;
}
