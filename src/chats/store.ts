import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, listDirectory, readJsonIfExists, toProjectRelative, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { formatIsoWithOffset } from '../common/time.js';
import { normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { CHATS_DIRECTORY } from '../project/books.js';
import type { Project } from '../project/workspace.js';
import { newTaskPath } from '../tasks/authoring.js';
import { generatedName } from '../tasks/identity.js';
import { formatModelRow, type ModelRow } from '../book/model.js';
import { MAX_ATTACHMENT_BYTES, materializeAttachments } from '../ui/attachments.js';
import type { ComposedSegment } from '../ui/composer.js';
import { appendChatCommitments, appendChatMessage, appendChatModel, chatAgent, chatDisplayTitle, hasMember, isHumanFacing, parseChatBook, renderChatBook, setChatStatus, type ChatBook, type ChatMessage, type ChatStatus } from './chat-book.js';

/**
 * How chat operations are versioned: saved to the Book at once, then committed in a bounded batch (`schedule`) or as
 * one commit per operation (`commit`), unless explicitly uncommitted.
 *
 * @private chats
 */
export type ChatPersistence = {
    /** Records saved paths of a chat for its batched commit (the engine's and the CLI's batches). */
    readonly schedule?: (chat: string, paths: readonly string[], trailers: Readonly<Record<string, string | readonly string[] | undefined>>) => Promise<void>;
    /** Commits exactly these paths; returns the commit (undefined when nothing was committed). Absent in no-commit mode. */
    readonly commit?: (paths: readonly string[], subject: string, trailers: Readonly<Record<string, string | readonly string[] | undefined>>) => Promise<string | undefined>;
    /** Records a written path as owned but uncommitted (explicit no-commit mode). */
    readonly uncommitted?: (path: string) => Promise<void>;
};

/**
 * A stored chat with its location.
 *
 * @private chats
 */
export type StoredChat = { readonly path: string; readonly relativePath: string; readonly chat: ChatBook };

/**
 * Summary of a chat for status views, dashboards and the API.
 *
 * @private chats
 */
export type ChatSummary = {
    /** Declared name: the chat's identity and reference (`{name}`). */
    readonly name: string;
    /** Presentation title: the latest `CHAT TITLE`, or the declared name without one. */
    readonly title: string;
    readonly path: string;
    readonly members: readonly string[];
    /** The main agent (the first agent member of a human-facing chat). */
    readonly agent?: string;
    readonly status: ChatStatus;
    readonly humanFacing: boolean;
    readonly links: readonly string[];
    readonly messages: number;
    readonly last?: { readonly sender: string; readonly at: string; readonly preview: string };
    /** The agent's question awaiting the user (when waiting-for-user). */
    readonly awaiting?: { readonly sender: string; readonly text: string; readonly choices?: readonly string[] };
    /** Saved messages whose batched commit is still pending (or failing and retried); absent when committed. */
    readonly persistence?: { readonly state: 'pending' | 'failed'; readonly since: string; readonly failure?: string };
    /** New messages not authored by User since this viewer last opened the chat. */
    readonly unread: number;
};

/**
 * Persistence state of a write: saved to the Book and committed, saved with its commit pending in a batch, or saved
 * and deliberately uncommitted (explicit no-commit, agent↔agent records of a task).
 *
 * @private chats
 */
export type ChatPersistenceState = 'committed' | 'pending' | 'uncommitted';

/**
 * Result of a chat write (the message is saved in its Book in every case).
 *
 * @private chats
 */
export type ChatWrite = StoredChat & { readonly commit?: string; readonly persistence?: ChatPersistenceState };

/**
 * Folder (inside `chats/`, never scanned for chat Books) holding the attachments of chat messages.
 *
 * @private chats
 */
export const CHAT_ASSETS_DIRECTORY = '_assets';

/**
 * Validates attachment segments supplied by a local client (existing readable files within the size limit).
 *
 * @private chats
 */
export async function validateAttachments(segments: readonly ComposedSegment[]): Promise<void> {
    for (const segment of segments) {
        if (segment.type !== 'attachment') continue;
        const stats = await stat(segment.path).catch(() => undefined);
        if (!stats?.isFile()) throw new PtbkError(`The attachment ${segment.name} is not a readable file.`, { kind: 'usage', effect: 'Nothing was saved.' });
        if (stats.size > MAX_ATTACHMENT_BYTES) throw new PtbkError(`The attachment ${segment.name} is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`, { kind: 'usage', effect: 'Nothing was saved.' });
    }
}

/**
 * Durable chat Books in root-level `chats/`, with per-message persistence and local read markers.
 *
 * @private chats
 */
export class ChatStore {
    private readonly mutex = new Mutex();
    /** Absolute chats directory. */
    public readonly directory: string;

    public constructor(
        private readonly project: Project,
        private readonly options: {
            readonly timeZone: string;
            readonly persistence?: ChatPersistence;
            /** Fresh normalized names of every project Book, rechecked when a new chat is published. */
            readonly takenNames?: () => Promise<ReadonlySet<string>>;
        },
    ) {
        this.directory = join(project.root, CHATS_DIRECTORY);
    }

    /** Current timestamp in the project's time zone. */
    public now(): string {
        return formatIsoWithOffset(Date.now(), this.options.timeZone);
    }

    /** Every chat Book (deterministic order: shallow first, then path). */
    public async list(): Promise<StoredChat[]> {
        const found: StoredChat[] = [];
        const stack = [this.directory];
        while (stack.length) {
            const current = stack.pop()!;
            for (const entry of await listDirectory(current)) {
                const path = join(current, entry.name);
                if (entry.isDirectory && !entry.name.startsWith('_') && !entry.name.startsWith('.')) stack.push(path);
                else if (entry.isFile && entry.name.toLowerCase().endsWith('.book')) {
                    const source = await readFile(path, 'utf8').catch(() => undefined);
                    if (source !== undefined) found.push({ path, relativePath: toProjectRelative(this.project.root, path), chat: parseChatBook(source) });
                }
            }
        }
        return found.sort((a, b) => a.relativePath.split('/').length - b.relativePath.split('/').length || (a.relativePath < b.relativePath ? -1 : 1));
    }

    /** Finds a chat by name (`{Name}`, `@Name` or plain text); the first same-name chat wins. */
    public async find(name: string): Promise<StoredChat | undefined> {
        const key = parseReferenceValue(name)?.normalized ?? normalizeAgentName(name);
        return (await this.list()).find((stored) => stored.chat.key === key);
    }

    /**
     * The message text with its attachments copied into the project (`chats/_assets/<chat>/<message>/`) and linked
     * relative to the chat Book: the same readable serialization as every rich input. Returns the copied files.
     */
    private async materialize(chatPath: string, messageNumber: number, segments: readonly ComposedSegment[] | undefined, text: string): Promise<{ text: string; files: string[] }> {
        if (!segments?.some((segment) => segment.type === 'attachment')) return { text, files: [] };
        await validateAttachments(segments);
        const directory = join(this.directory, CHAT_ASSETS_DIRECTORY, basename(chatPath).replace(/\.book$/i, ''), String(messageNumber));
        const link = (name: string): string => relative(dirname(chatPath), join(directory, name)).split(sep).join('/');
        return await materializeAttachments(segments, { directory, link });
    }

    /**
     * Creates a chat named after its readable title plus creation date/time (distinct under normalization from every
     * Book); a human-facing chat is committed. The final name is allocated once, under the store's lock. Attachments of
     * the first message (`segments`) are copied into the project and committed with it.
     */
    public async create(options: {
        readonly name: string;
        readonly members: readonly string[];
        readonly status: ChatStatus;
        readonly links?: readonly string[];
        readonly messages?: ReadonlyArray<Pick<ChatMessage, 'sender' | 'text' | 'choices'> & { readonly at?: string }>;
        /** Normalized names already used by other Books. */
        readonly taken?: ReadonlySet<string>;
        /** Extra trailers (e.g. `Task-Name`). */
        readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>>;
        /**
         * Commit even an agent↔agent chat as its own scoped operation (a consultation serving a conversation without
         * an owning task); task-scoped consultations instead join their task's result commit.
         */
        readonly commit?: boolean;
        /** The first message's complete composed payload (attachments become project assets). */
        readonly segments?: readonly ComposedSegment[];
    }): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const fresh = (await this.options.takenNames?.().catch(() => undefined)) ?? [];
            const taken = new Set([...(options.taken ?? []), ...fresh, ...(await this.list()).map((stored) => stored.chat.key)]);
            const title = options.name.replace(/[\r\n]+/g, ' ').slice(0, 120);
            const name = generatedName(title, { taken, timeZone: this.options.timeZone });
            await ensureDirectory(this.directory);
            const path = await newTaskPath(this.directory, title, Date.now(), this.options.timeZone);
            const messages = [...(options.messages ?? [])];
            const assets = messages[0] ? await this.materialize(path, 1, options.segments, messages[0].text) : { text: '', files: [] };
            if (messages[0]) messages[0] = { ...messages[0], text: assets.text };
            const source = renderChatBook({ name, members: options.members, status: options.status, links: options.links, messages: messages.map((message) => ({ ...message, at: message.at ?? this.now() })) });
            await writeFile(path, source, { flag: 'wx' });
            const chat = parseChatBook(source);
            const persisted = isHumanFacing(chat) || options.commit ? await this.persist(path, name, options.trailers, undefined, assets.files) : { persistence: 'uncommitted' as const };
            return { path, relativePath: toProjectRelative(this.project.root, path), chat, ...persisted };
        });
    }

    /**
     * Appends one message (optionally changing the status) in a single save and, for human-facing chats, commit.
     *
     * `expectedMessages` rejects a stale client that did not see the latest message (no duplicate answers).
     */
    public async append(
        name: string,
        message: Pick<ChatMessage, 'sender' | 'text' | 'choices'>,
        options: { readonly status?: ChatStatus; readonly expectedMessages?: number; readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>>; readonly segments?: readonly ComposedSegment[] } = {},
    ): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found', next: ['List chats with `ptbk chat --list`.'] });
            if (options.expectedMessages !== undefined && options.expectedMessages !== stored.chat.messages.length) {
                throw new PtbkError(`The chat "${stored.chat.name}" changed since it was displayed (${stored.chat.messages.length} messages, expected ${options.expectedMessages}).`, {
                    kind: 'conflict',
                    effect: 'Your message was not added twice; nothing was saved.',
                    next: ['Reload the chat and reply again if still needed.'],
                });
            }
            if (!message.text.trim() && !options.segments?.some((segment) => segment.type === 'attachment')) throw new PtbkError('A chat message cannot be empty.', { kind: 'usage' });
            const assets = await this.materialize(stored.path, stored.chat.messages.length + 1, options.segments, message.text);
            const source = await readFile(stored.path, 'utf8');
            const updated = appendChatMessage(source, { ...message, text: assets.text, at: this.now() }, options.status);
            await writeFile(stored.path, updated);
            const chat = parseChatBook(updated);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, options.trailers, undefined, assets.files) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted };
        });
    }

    /**
     * Records the conversation's resolved MODEL after the messages so far, as its own scoped commit (between the
     * committed User message and the later agent reply).
     */
    public async recordModel(name: string, row: ModelRow, options: { readonly by?: string } = {}): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            const updated = appendChatModel(await readFile(stored.path, 'utf8'), { rows: [row], explicit: true });
            await writeFile(stored.path, updated);
            const chat = parseChatBook(updated);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, { 'Chat-Model': formatModelRow(row), ...(options.by ? { 'Routed-By': options.by } : {}) }, `Chat routing - ${chat.name}`) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted };
        });
    }

    /**
     * Appends single-line commitments in chronological position: a joining agent (`CHAT MEMBER`, idempotent for an
     * existing participant), named links (`LINK`, deduplicated) and a new presentation title (`CHAT TITLE`, unchanged
     * titles are not repeated). Returns the stored chat unchanged when nothing new was added.
     */
    public async annotate(name: string, additions: { readonly members?: readonly string[]; readonly links?: readonly string[]; readonly title?: string }, options: { readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>> } = {}): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            const lines: string[] = [];
            const members = new Set<string>();
            for (const member of additions.members ?? []) {
                const key = parseReferenceValue(member)?.normalized ?? normalizeAgentName(member);
                if (hasMember(stored.chat, member) || members.has(key)) continue;
                members.add(key);
                lines.push(`CHAT MEMBER ${member}`);
            }
            const links = new Set(stored.chat.links.map((link) => parseReferenceValue(link)?.normalized ?? link));
            for (const link of additions.links ?? []) {
                const key = parseReferenceValue(link)?.normalized ?? link;
                if (links.has(key)) continue;
                links.add(key);
                lines.push(`LINK ${link}`);
            }
            const title = additions.title?.replace(/\s+/g, ' ').trim().slice(0, 200);
            if (title && title !== stored.chat.title && title !== stored.chat.name) lines.push(`CHAT TITLE ${title}`);
            if (!lines.length) return stored;
            const updated = appendChatCommitments(await readFile(stored.path, 'utf8'), lines);
            await writeFile(stored.path, updated);
            const chat = parseChatBook(updated);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, options.trailers) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted };
        });
    }

    /** Changes only the durable status (e.g. resolving a request without a new message). */
    public async setStatus(name: string, status: ChatStatus): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            if (stored.chat.status === status) return stored;
            const updated = setChatStatus(await readFile(stored.path, 'utf8'), status);
            await writeFile(stored.path, updated);
            const chat = parseChatBook(updated);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted };
        });
    }

    /**
     * Versions one saved chat operation: batched (its commit pending), committed now, or recorded as uncommitted.
     */
    private async persist(path: string, name: string, trailers: Readonly<Record<string, string | readonly string[] | undefined>> = {}, subject = `Chat - ${name}`, assets: readonly string[] = []): Promise<{ readonly commit?: string; readonly persistence: ChatPersistenceState }> {
        const persistence = this.options.persistence;
        if (!persistence) return { persistence: 'uncommitted' };
        if (persistence.schedule) {
            await persistence.schedule(name, [path, ...assets], trailers);
            return { persistence: 'pending' };
        }
        if (!persistence.commit) {
            for (const file of [path, ...assets]) await persistence.uncommitted?.(file);
            return { persistence: 'uncommitted' };
        }
        try {
            const commit = await persistence.commit([path, ...assets], subject, { 'Chat-Name': name, ...trailers });
            return { commit, persistence: 'committed' };
        } catch (error) {
            throw new PtbkError(`The chat message was written but could not be committed.`, {
                kind: 'persistence',
                reason: (error as PtbkError).details?.reason ?? String(error),
                preserved: `${toProjectRelative(this.project.root, path)} keeps the message; it is visibly unsent until committed.`,
                next: ['Fix the Git problem; the pending change is committed with the next chat operation or by `ptbk recover`.'],
            });
        }
    }

    /** Local per-viewer read markers (`.ptbk/state/chat-read.json`): chat key → seen message count. */
    public async readMarkers(): Promise<Record<string, number>> {
        return (await readJsonIfExists<Record<string, number>>(join(this.project.runtime.state, 'chat-read.json')).catch(() => undefined)) ?? {};
    }

    /** Marks a chat as read up to its current messages (runtime-only; never committed, never an answer). */
    public async markRead(name: string): Promise<void> {
        const stored = await this.find(name);
        if (!stored) return;
        const markers = await this.readMarkers();
        markers[stored.chat.key] = stored.chat.messages.length;
        await ensureDirectory(this.project.runtime.state);
        await writeJsonAtomic(join(this.project.runtime.state, 'chat-read.json'), markers);
    }

    /** Summaries of every chat, waiting-for-user first, then most recent. */
    public async summaries(): Promise<ChatSummary[]> {
        const markers = await this.readMarkers();
        const summaries = (await this.list()).map(({ relativePath, chat }) => summarize(chat, relativePath, markers[chat.key] ?? 0));
        return summaries.sort((a, b) => Number(b.status === 'waiting-for-user') - Number(a.status === 'waiting-for-user') || (b.last?.at ?? '').localeCompare(a.last?.at ?? ''));
    }
}

/**
 * Builds the summary of one chat.
 *
 * @private chats
 */
export function summarize(chat: ChatBook, relativePath: string, seen: number): ChatSummary {
    const last = chat.messages[chat.messages.length - 1];
    const awaiting = chat.status === 'waiting-for-user' ? [...chat.messages].reverse().find((message) => message.senderKey !== 'user') : undefined;
    return {
        name: chat.name,
        title: chatDisplayTitle(chat),
        path: relativePath,
        members: chat.members,
        agent: chatAgent(chat),
        status: chat.status,
        humanFacing: isHumanFacing(chat),
        links: chat.links,
        messages: chat.messages.length,
        last: last ? { sender: last.sender, at: last.at, preview: last.text.replace(/\s+/g, ' ').slice(0, 160) } : undefined,
        awaiting: awaiting ? { sender: awaiting.sender, text: awaiting.text, choices: awaiting.choices } : undefined,
        unread: chat.messages.slice(seen).filter((message) => message.senderKey !== 'user').length,
    };
}
