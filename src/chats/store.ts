import { copyFile, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { ignoredPaths } from '../project/git.js';
import { appendMessageAudio, type MessageAudio, type MessageAudioStatus, type MessageAudioTiming } from './message-audio.js';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, listDirectory, readJsonIfExists, toProjectRelative, writeFileAtomic, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';
import { formatIsoWithOffset } from '../common/time.js';
import { formatAgentReference, normalizeAgentName, parseReferenceValue, pingsUser, referenceName } from '../book/references.js';
import { CHATS_DIRECTORY } from '../project/books.js';
import type { Project } from '../project/workspace.js';
import { newTaskPath } from '../tasks/authoring.js';
import { generatedName } from '../tasks/identity.js';
import { formatModelRow, type ModelRow } from '../book/model.js';
import { MAX_ATTACHMENT_BYTES, materializeAttachments } from '../ui/attachments.js';
import type { ComposedSegment } from '../ui/composer.js';
import { ChatAttention, pingId, pingOwner, type ChatPing } from './attention.js';
import { appendChatCommitments, appendChatMessage, appendChatModel, chatAgent, chatDisplayTitle, hasMember, isConsultationRecord, isHumanFacing, parseChatBook, renderChatBook, replaceChatMessage, setChatStatus, type ChatBook, type ChatMessage, type ChatStatus } from './chat-book.js';

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
 * One finalized recorded segment handed to {@link ChatStore.recordAudio}: its stable identity (the same segment
 * finalized again is not stored twice), the file or bytes and its honest recording state.
 *
 * @private chats
 */
export type MessageAudioInput = {
    /** Stable segment identity (e.g. `<call>-user-3`); it names the stored asset. */
    readonly id: string;
    /** File extension of the recording (`webm`, `wav`, `ogg`, …). */
    readonly extension: string;
    /** A finalized file to copy into the project. */
    readonly file?: string;
    /** Or the finalized bytes. */
    readonly data?: Uint8Array;
    /** Recording state (`complete` by default). */
    readonly status?: MessageAudioStatus;
    /** Shared call timing, when known. */
    readonly timing?: MessageAudioTiming;
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
    /** An agent-only thread the user may join with a message (not a bounded consultation record). */
    readonly joinable: boolean;
    readonly links: readonly string[];
    readonly messages: number;
    readonly last?: { readonly sender: string; readonly at: string; readonly preview: string };
    /** The agent's question awaiting the user (when waiting-for-user). */
    readonly awaiting?: { readonly sender: string; readonly text: string; readonly choices?: readonly string[] };
    /** Saved messages whose batched commit is still pending (or failing and retried); absent when committed. */
    readonly persistence?: { readonly state: 'pending' | 'failed'; readonly since: string; readonly failure?: string };
    /** New messages not authored by User since this viewer last opened the chat. */
    readonly unread: number;
    /**
     * Explicit User pings (and legacy waiting questions) nobody has seen yet and no answer has cleared: the chat's
     * attention. A seen question can still wait (`status`); seeing it only removes its alert.
     */
    readonly pings?: readonly ChatPingView[];
};

/**
 * One unseen attention occurrence of a chat: the calling message and its author.
 *
 * @private chats
 */
export type ChatPingView = {
    /** Stable identity of the occurrence. */
    readonly id: string;
    /** 1-based position of the calling message. */
    readonly message: number;
    readonly sender: string;
    /** When the calling message was written. */
    readonly at: string;
    /** The calling message (bounded preview; the full message stays in the chat). */
    readonly text: string;
    /** Responsible agent when it differs from the author (transferred to Fixer). */
    readonly owner?: string;
};

/**
 * Longest preview of a calling message in summaries and notifications.
 */
const PING_PREVIEW_LENGTH = 400;

/**
 * Whether a sender reference is the human User.
 */
function isUserSender(sender: string): boolean {
    return (parseReferenceValue(sender)?.normalized ?? normalizeAgentName(sender)) === 'user';
}

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
    /** Shared seen/resolved state of explicit User pings (project runtime state, never committed). */
    public readonly attention: ChatAttention;

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
        this.attention = new ChatAttention(project.runtime.state);
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
            // An agent message that explicitly pings the human (+@User) invites it: User is a member before it speaks.
            const pinging = messages.flatMap((message, index) => (!isUserSender(message.sender) && pingsUser(message.text) ? [index + 1] : []));
            const consultation = isConsultationRecord({ members: options.members, links: options.links ?? [] });
            const members = pinging.length && !consultation && !hasMember({ members: options.members }, '@User') ? [...options.members, '@User'] : options.members;
            const source = renderChatBook({ name, members, status: options.status, links: options.links, messages: messages.map((message) => ({ ...message, at: message.at ?? this.now() })) });
            await writeFile(path, source, { flag: 'wx' });
            const chat = parseChatBook(source);
            if (!consultation) for (const position of pinging) await this.recordPing(chat, position);
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
        message: Pick<ChatMessage, 'sender' | 'text' | 'choices' | 'phase'>,
        options: {
            readonly status?: ChatStatus;
            readonly expectedMessages?: number;
            readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>>;
            readonly segments?: readonly ComposedSegment[];
            /** Evidence files of the turn (e.g. its raw usage) versioned with the message when trace policy allows it. */
            readonly evidence?: readonly string[];
            /** Participants joining right before this message (`CHAT MEMBER`, idempotent), saved in the same write. */
            readonly join?: readonly string[];
        } = {},
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
            const original = await readFile(stored.path, 'utf8');
            // An accepted agent message with an explicit +@User invites the human (once) and pings it again when it is
            // already a member; progress of a turn is not an accepted message yet.
            const ping = !isUserSender(message.sender) && message.phase !== 'progress' && pingsUser(message.text) && !isConsultationRecord(stored.chat);
            const joining = [...(ping ? ['@User'] : []), ...(options.join ?? [])].filter((member, index, all) => !hasMember(stored.chat, member) && all.findIndex((other) => (parseReferenceValue(other)?.normalized ?? other) === (parseReferenceValue(member)?.normalized ?? member)) === index);
            const source = joining.length ? appendChatCommitments(original, joining.map((member) => `CHAT MEMBER ${member}`)) : original;
            const updated = appendChatMessage(source, { ...message, text: assets.text, at: this.now() }, options.status);
            await writeFileAtomic(stored.path, updated);
            const chat = parseChatBook(updated);
            if (ping) await this.recordPing(chat, chat.messages.length);
            if (options.status && options.status !== 'waiting-for-user' && stored.chat.status === 'waiting-for-user') await this.resolvePings(stored.chat, () => true);
            // Ignored evidence (traces not committed) never enters a commit: the batch only commits changed, unignored files.
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, options.trailers, undefined, [...assets.files, ...(options.evidence ?? [])]) : { persistence: 'uncommitted' as const };
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
            await writeFileAtomic(stored.path, updated);
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
            await writeFileAtomic(stored.path, updated);
            const chat = parseChatBook(updated);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, options.trailers) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted };
        });
    }

    /**
     * Saves the progress of a reply in progress: the turn's one `progress` message (identified by its sender and turn
     * timestamp) is updated in place, or appended when it does not exist yet. Returns its position.
     */
    public async upsertProgress(name: string, message: Pick<ChatMessage, 'sender' | 'at' | 'text'>): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            const source = await readFile(stored.path, 'utf8');
            const key = parseReferenceValue(message.sender)?.normalized ?? normalizeAgentName(message.sender);
            let index = -1;
            stored.chat.messages.forEach((existing, position) => {
                if (existing.phase === 'progress' && existing.senderKey === key && existing.at === message.at) index = position;
            });
            const updated = index >= 0 ? replaceChatMessage(source, index, { ...message, phase: 'progress' }) : appendChatMessage(source, { ...message, phase: 'progress' });
            await writeFileAtomic(stored.path, updated);
            const chat = parseChatBook(updated);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted };
        });
    }

    /**
     * Versions evidence files of a chat's work (e.g. raw usage of a turn that ended without a reply) with the chat's
     * batch, so they never linger as unowned changes; ignored evidence is simply not committed.
     */
    public async attachEvidence(name: string, paths: readonly string[]): Promise<void> {
        await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (stored && isHumanFacing(stored.chat)) await this.persist(stored.path, stored.chat.name, {}, undefined, paths);
        });
    }

    /**
     * Binds finalized recorded speech to one existing message (1-based position) as another representation of that
     * same utterance: each segment is stored once as a project chat asset (`chats/_assets/<chat>/<message>/`) and its
     * `CHAT MESSAGE AUDIO` line joins the message's group in the same save. The binding and its file are versioned
     * together in the chat's ordinary batch by default, independently of traces. A segment identity that is already
     * bound (reconnect, repeated finalization) changes nothing, and nothing is dispatched again. An asset that Git
     * ignores is reported as an incomplete archive rather than silently treated as saved.
     */
    public async recordAudio(name: string, message: number, segments: readonly MessageAudioInput[]): Promise<ChatWrite & { readonly audio: readonly MessageAudio[]; readonly archive: { readonly complete: boolean; readonly problems: readonly string[] } }> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            const target = stored.chat.messages[message - 1];
            if (!Number.isInteger(message) || !target) throw new PtbkError(`The chat "${stored.chat.name}" has no message ${message} to record audio for.`, { kind: 'usage', effect: 'Nothing was saved.' });
            const directory = join(this.directory, CHAT_ASSETS_DIRECTORY, basename(stored.path).replace(/\.book$/i, ''), String(message));
            const bound = new Set((target.audio ?? []).map((audio) => audio.path));
            const files: string[] = [];
            const audio: MessageAudio[] = [];
            for (const segment of segments) {
                const id = segment.id.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80);
                const extension = segment.extension.replace(/^\./, '').toLowerCase();
                if (!id || !/^[a-z0-9]{1,8}$/.test(extension)) throw new PtbkError(`The audio segment "${segment.id}" needs a readable identity and a file extension.`, { kind: 'usage', effect: 'Nothing was saved.' });
                const file = join(directory, `audio-${id}.${extension}`);
                const path = toProjectRelative(this.project.root, file);
                if (bound.has(path) || audio.some((existing) => existing.path === path)) continue;
                await ensureDirectory(directory);
                if (segment.data) await writeFileAtomic(file, segment.data);
                else if (segment.file && resolve(segment.file) !== file) await copyFile(segment.file, file);
                else if (!(await stat(file).catch(() => undefined))?.isFile()) throw new PtbkError(`The audio segment "${segment.id}" has no finalized file.`, { kind: 'usage', effect: 'Nothing was saved.' });
                files.push(file);
                audio.push({ path, status: segment.status ?? 'complete', ...(segment.timing ? { timing: segment.timing } : {}) });
            }
            if (!audio.length) return { ...stored, audio: [], archive: { complete: true, problems: [] } };
            const updated = appendMessageAudio(await readFile(stored.path, 'utf8'), message - 1, audio);
            await writeFileAtomic(stored.path, updated);
            const chat = parseChatBook(updated);
            const ignored = this.options.persistence?.commit || this.options.persistence?.schedule ? await ignoredPaths(this.project.root, files).catch(() => new Set<string>()) : new Set<string>();
            const problems = [...ignored].map((file) => `${toProjectRelative(this.project.root, file)} is ignored by Git, so the recording is not versioned with its binding.`);
            // Ignored recordings are never force-added; the binding is versioned and the gap reported.
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, { 'Chat-Audio': audio.map((item) => item.path) }, undefined, files.filter((file) => !ignored.has(file))) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted, audio, archive: { complete: !problems.length, problems } };
        });
    }

    /**
     * Every outstanding human request of the chats (seen or not, never resolved or withdrawn), with its responsible
     * agent: the input of attention ownership and relevance supervision.
     */
    public async outstandingRequests(): Promise<OutstandingRequest[]> {
        const pings = await this.attention.list().catch(() => [] as ChatPing[]);
        const requests: OutstandingRequest[] = [];
        for (const stored of await this.list()) {
            if (!isHumanFacing(stored.chat)) continue;
            for (const ping of unresolvedPings(stored.chat, pings)) {
                requests.push({ ...ping, owner: pingOwner(ping), text: stored.chat.messages[ping.message - 1]?.text ?? '', relativePath: stored.relativePath, links: stored.chat.links, status: stored.chat.status, messages: stored.chat.messages.length });
            }
        }
        return requests;
    }

    /**
     * Withdraws outstanding human requests of a chat that verified evidence made obsolete (all of them when `messages`
     * is omitted), under [attention ownership](specs/cli/notifications.md): the questions, their active User prefixes,
     * authorship and membership stay in history; only their wait and attention are retired in every client. The
     * responsible agent appends **one** ordinary explanation (joining first when it is not a member), without a new
     * active User ping. When no human dependency remains, the chat's applicable `CHAT STATUS open` follows. Withdrawing
     * again (racing checks, retries, restart) changes nothing.
     */
    public async withdrawRequests(name: string, input: { readonly messages?: readonly number[]; readonly by: string; readonly reason: string; readonly trailers?: Readonly<Record<string, string | readonly string[] | undefined>> }): Promise<ChatWrite & { readonly withdrawn: readonly number[]; readonly remaining: number }> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            const pings = await this.attention.list();
            const outstanding = unresolvedPings(stored.chat, pings);
            const wanted = input.messages ? new Set(input.messages) : undefined;
            const targets = outstanding.filter((ping) => !wanted || wanted.has(ping.message));
            if (!targets.length) return { ...stored, withdrawn: [], remaining: outstanding.length };
            const by = referenceName(input.by);
            const ids = await this.attention.withdraw({ key: stored.chat.key, messages: targets.map((ping) => ping.message), by, reason: input.reason, implicit: targets.filter((ping) => ping.implicit) });
            if (!ids.length) return { ...stored, withdrawn: [], remaining: outstanding.length };
            const remaining = outstanding.length - targets.length;
            const sender = formatAgentReference(by);
            const original = await readFile(stored.path, 'utf8');
            const source = hasMember(stored.chat, sender) ? original : appendChatCommitments(original, [`CHAT MEMBER ${sender}`]);
            const updated = appendChatMessage(source, { sender, text: passiveResolution(input.reason), at: this.now() }, !remaining && stored.chat.status === 'waiting-for-user' ? 'open' : undefined);
            await writeFileAtomic(stored.path, updated);
            const chat = parseChatBook(updated);
            await this.attention.recordWithdrawalMessage(ids, chat.messages.length);
            const persisted = isHumanFacing(chat) ? await this.persist(stored.path, chat.name, { 'Attention-Resolved': targets.map((ping) => String(ping.message)), ...input.trailers }) : { persistence: 'uncommitted' as const };
            return { ...stored, chat, ...persisted, withdrawn: targets.map((ping) => ping.message), remaining };
        });
    }

    /**
     * Completes withdrawals whose explanation was not appended (an interruption between retiring the wait and saving
     * the message): the message is appended once, recognized when it already exists, and the wait never reopens.
     */
    public async reconcileWithdrawals(): Promise<number> {
        const pending = (await this.attention.list().catch(() => [] as ChatPing[])).filter((ping) => ping.withdrawn && !ping.withdrawn.message);
        let completed = 0;
        for (const ping of pending) {
            const withdrawal = ping.withdrawn!;
            await this.mutex.run(async () => {
                const stored = await this.find(ping.chat);
                if (!stored) return;
                const sender = formatAgentReference(withdrawal.by);
                const text = passiveResolution(withdrawal.reason);
                const existing = stored.chat.messages.findIndex((message, index) => index >= ping.message && message.senderKey === (parseReferenceValue(sender)?.normalized ?? '') && message.text === text);
                if (existing >= 0) {
                    await this.attention.recordWithdrawalMessage([ping.id], existing + 1);
                    return;
                }
                const remaining = unresolvedPings(stored.chat, await this.attention.list()).length;
                const original = await readFile(stored.path, 'utf8');
                const source = hasMember(stored.chat, sender) ? original : appendChatCommitments(original, [`CHAT MEMBER ${sender}`]);
                const updated = appendChatMessage(source, { sender, text, at: this.now() }, !remaining && stored.chat.status === 'waiting-for-user' ? 'open' : undefined);
                await writeFileAtomic(stored.path, updated);
                const chat = parseChatBook(updated);
                await this.attention.recordWithdrawalMessage([ping.id], chat.messages.length);
                if (isHumanFacing(chat)) await this.persist(stored.path, chat.name, { 'Attention-Resolved': String(ping.message) });
                completed++;
            });
        }
        return completed;
    }

    /** Changes only the durable status (e.g. resolving a request without a new message). */
    public async setStatus(name: string, status: ChatStatus): Promise<ChatWrite> {
        return await this.mutex.run(async () => {
            const stored = await this.find(name);
            if (!stored) throw new PtbkError(`No chat named "${name}".`, { kind: 'not-found' });
            if (stored.chat.status === status) return stored;
            const updated = setChatStatus(await readFile(stored.path, 'utf8'), status);
            await writeFileAtomic(stored.path, updated);
            const chat = parseChatBook(updated);
            // A chat that no longer waits for the human has no outstanding question left to alert about.
            if (stored.chat.status === 'waiting-for-user') await this.resolvePings(stored.chat, () => true);
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
        const pings = await this.attention.list().catch(() => [] as ChatPing[]);
        const summaries = (await this.list()).map(({ relativePath, chat }) => summarize(chat, relativePath, markers[chat.key] ?? 0, pings));
        return summaries.sort((a, b) => Number(b.status === 'waiting-for-user') - Number(a.status === 'waiting-for-user') || (b.last?.at ?? '').localeCompare(a.last?.at ?? ''));
    }

    /** Records the explicit User ping of an accepted message (idempotent per chat position). */
    private async recordPing(chat: ChatBook, position: number): Promise<void> {
        const message = chat.messages[position - 1];
        if (!message) return;
        await this.attention.record({ chat: chat.name, key: chat.key, message: position, sender: message.sender, at: message.at }).catch(() => undefined);
    }

    /**
     * Marks the occurrences whose calling messages an active viewer actually displayed as seen, for every client and
     * across restarts. Only currently unseen occurrences of this chat are touched; the questions keep waiting.
     * Returns how many became seen.
     */
    public async markSeen(name: string, messages: readonly number[]): Promise<number> {
        const stored = await this.find(name);
        if (!stored) return 0;
        const wanted = new Set(messages.filter((message) => Number.isInteger(message) && message > 0));
        const candidates = outstandingPings(stored.chat, await this.attention.list()).filter((ping) => wanted.has(ping.message));
        return await this.attention.markSeen(candidates);
    }

    /**
     * Clears the outstanding occurrences of a chat that `applies` selects (a saved answer or a settled question),
     * including a legacy question that was never seen.
     */
    public async resolvePings(chat: ChatBook, applies: (ping: Pick<ChatPing, 'message' | 'sender'>) => boolean): Promise<void> {
        const implicit = outstandingPings(chat, await this.attention.list().catch(() => [])).filter((ping) => ping.implicit);
        await this.attention.resolve(chat.key, applies, implicit).catch(() => undefined);
    }
}

/**
 * One outstanding human request of a chat with its responsible agent (seen or not).
 *
 * @private chats
 */
export type OutstandingRequest = Pick<ChatPing, 'id' | 'chat' | 'key' | 'message' | 'sender' | 'at' | 'seenAt' | 'implicit'> & {
    /** Responsible agent (the author, or Fixer after a transfer). */
    readonly owner: string;
    /** Whether responsibility was transferred from the author. */
    readonly transferredAt?: string;
    /** The calling message. */
    readonly text: string;
    /** Project-relative path of the chat Book. */
    readonly relativePath: string;
    /** Links of the chat (e.g. the task the question serves). */
    readonly links: readonly string[];
    /** Durable status of the chat. */
    readonly status: ChatStatus;
    /** Messages of the chat now. */
    readonly messages: number;
};

/**
 * A resolution explanation as ordinary passive prose: an announcement of cleanup never pings the human again.
 */
function passiveResolution(reason: string): string {
    const text = reason.trim().replace(/\+(@User\b|\{\s*User\s*\})/gi, '$1');
    return text || 'This is no longer needed.';
}

/**
 * Every unresolved occurrence of one chat (seen or not): its recorded explicit pings, plus the awaited message of a
 * legacy waiting question without any occurrence.
 */
function unresolvedPings(chat: ChatBook, pings: readonly ChatPing[]): Array<ChatPing & { readonly implicit?: true }> {
    const own = pings.filter((ping) => ping.key === chat.key && ping.message <= chat.messages.length);
    const unresolved: Array<ChatPing & { readonly implicit?: true }> = own.filter((ping) => !ping.resolvedAt);
    if (chat.status === 'waiting-for-user' && isHumanFacing(chat) && !own.length) {
        let position = chat.messages.length;
        while (position > 0 && (chat.messages[position - 1]!.phase === 'progress' || isUserSender(chat.messages[position - 1]!.sender))) position--;
        const awaited = chat.messages[position - 1];
        if (awaited) unresolved.push({ id: pingId(chat.key, position), chat: chat.name, key: chat.key, message: position, sender: awaited.sender, at: awaited.at, implicit: true });
    }
    return unresolved.sort((a, b) => a.message - b.message);
}

/**
 * The unseen, unresolved occurrences of one chat: its recorded explicit pings, plus the awaited message of a chat
 * waiting for the user that has no occurrence at all (a question written before explicit pings existed). Once a chat
 * has a recorded occurrence, later agent messages without the literal prefix stay passive.
 */
function outstandingPings(chat: ChatBook, pings: readonly ChatPing[]): Array<Pick<ChatPing, 'id' | 'chat' | 'key' | 'message' | 'sender' | 'at' | 'implicit' | 'owner'>> {
    const own = pings.filter((ping) => ping.key === chat.key && ping.message <= chat.messages.length);
    const outstanding: Array<Pick<ChatPing, 'id' | 'chat' | 'key' | 'message' | 'sender' | 'at' | 'implicit' | 'owner'>> = own.filter((ping) => !ping.seenAt && !ping.resolvedAt);
    if (chat.status === 'waiting-for-user' && isHumanFacing(chat) && !own.length) {
        let position = chat.messages.length;
        while (position > 0 && (chat.messages[position - 1]!.phase === 'progress' || isUserSender(chat.messages[position - 1]!.sender))) position--;
        const awaited = chat.messages[position - 1];
        if (awaited && !own.some((ping) => ping.message === position)) outstanding.push({ id: pingId(chat.key, position), chat: chat.name, key: chat.key, message: position, sender: awaited.sender, at: awaited.at, implicit: true });
    }
    return outstanding.sort((a, b) => a.message - b.message);
}

/**
 * Builds the summary of one chat.
 *
 * @private chats
 */
export function summarize(chat: ChatBook, relativePath: string, seen: number, pings: readonly ChatPing[] = []): ChatSummary {
    const last = chat.messages[chat.messages.length - 1];
    const outstanding = outstandingPings(chat, pings).map((ping): ChatPingView => ({ id: ping.id, message: ping.message, sender: ping.sender, at: ping.at, text: (chat.messages[ping.message - 1]?.text ?? '').slice(0, PING_PREVIEW_LENGTH), ...(ping.owner ? { owner: ping.owner } : {}) }));
    const awaiting = chat.status === 'waiting-for-user' ? [...chat.messages].reverse().find((message) => message.senderKey !== 'user') : undefined;
    return {
        name: chat.name,
        title: chatDisplayTitle(chat),
        path: relativePath,
        members: chat.members,
        agent: chatAgent(chat),
        status: chat.status,
        humanFacing: isHumanFacing(chat),
        joinable: !isHumanFacing(chat) && !isConsultationRecord(chat),
        links: chat.links,
        messages: chat.messages.length,
        last: last ? { sender: last.sender, at: last.at, preview: last.text.replace(/\s+/g, ' ').slice(0, 160) } : undefined,
        awaiting: awaiting ? { sender: awaiting.sender, text: awaiting.text, choices: awaiting.choices } : undefined,
        unread: chat.messages.slice(seen).filter((message) => message.senderKey !== 'user').length,
        ...(outstanding.length ? { pings: outstanding } : {}),
    };
}
