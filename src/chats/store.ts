import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, listDirectory, readJsonIfExists, toProjectRelative, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { formatIsoWithOffset } from '../common/time.js';
import { normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { CHATS_DIRECTORY } from '../project/books.js';
import type { Project } from '../project/workspace.js';
import { newTaskPath } from '../tasks/authoring.js';
import { distinctName } from '../tasks/identity.js';
import { appendChatMessage, chatAgent, isHumanFacing, parseChatBook, renderChatBook, setChatStatus, type ChatBook, type ChatMessage, type ChatStatus } from './chat-book.js';

/**
 * How chat operations are versioned: each human-facing operation is its own commit unless explicitly uncommitted.
 *
 * @private chats
 */
export type ChatPersistence = {
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
    readonly name: string;
    readonly path: string;
    readonly members: readonly string[];
    /** The agent participant (human-facing chats). */
    readonly agent?: string;
    readonly status: ChatStatus;
    readonly humanFacing: boolean;
    readonly links: readonly string[];
    readonly messages: number;
    readonly last?: { readonly sender: string; readonly at: string; readonly preview: string };
    /** The agent's question awaiting the user (when waiting-for-user). */
    readonly awaiting?: { readonly sender: string; readonly text: string; readonly choices?: readonly string[] };
    /** New messages not authored by User since this viewer last opened the chat. */
    readonly unread: number;
};

/**
 * Result of a chat write.
 *
 * @private chats
 */
export type ChatWrite = StoredChat & { readonly commit?: string };

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
        private readonly options: { readonly timeZone: string; readonly persistence?: ChatPersistence },
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
     * Creates a chat with a readable name distinct under normalization; a human-facing chat is committed.
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
    }): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const taken = new Set([...(options.taken ?? []), ...(await this.list()).map((stored) => stored.chat.key)]);
            const name = distinctName(options.name.replace(/[\r\n]+/g, ' ').slice(0, 120), taken);
            await ensureDirectory(this.directory);
            const path = await newTaskPath(this.directory, name, Date.now(), this.options.timeZone);
            const source = renderChatBook({ name, members: options.members, status: options.status, links: options.links, messages: (options.messages ?? []).map((message) => ({ ...message, at: message.at ?? this.now() })) });
            await writeFile(path, source, { flag: 'wx' });
            const chat = parseChatBook(source);
            const commit = isHumanFacing(chat) ? await this.persist(path, name, options.trailers) : undefined;
            return { path, relativePath: toProjectRelative(this.project.root, path), chat, commit };
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
        options: { readonly status?: ChatStatus; readonly expectedMessages?: number; readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>> } = {},
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
            if (!message.text.trim()) throw new PtbkError('A chat message cannot be empty.', { kind: 'usage' });
            const source = await readFile(stored.path, 'utf8');
            const updated = appendChatMessage(source, { ...message, at: this.now() }, options.status);
            await writeFile(stored.path, updated);
            const chat = parseChatBook(updated);
            const commit = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, options.trailers) : undefined;
            return { ...stored, chat, commit };
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
            const commit = isHumanFacing(chat) ? await this.persist(stored.path, chat.name) : undefined;
            return { ...stored, chat, commit };
        });
    }

    /** Commits (or records as uncommitted) one chat operation. */
    private async persist(path: string, name: string, trailers: Readonly<Record<string, string | readonly string[] | undefined>> = {}): Promise<string | undefined> {
        const persistence = this.options.persistence;
        if (!persistence) return undefined;
        if (!persistence.commit) {
            await persistence.uncommitted?.(path);
            return undefined;
        }
        try {
            return await persistence.commit([path], `Chat - ${name}`, { 'Chat-Name': name, ...trailers });
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
