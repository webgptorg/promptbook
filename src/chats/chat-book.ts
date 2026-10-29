import { modelOfDocument, renderModelLines, type ModelConstraint } from '../book/model.js';
import { commitmentsOf, parseBook, type BookDiagnostic, type BookDocument } from '../book/parse.js';
import { formatAgentReference, invalidReferenceMessage, normalizeAgentName, parseReferenceValue } from '../book/references.js';
import { needsLiteralEscape, renderDeclaration } from '../book/write.js';

/**
 * Durable action state of a chat (independent of per-viewer read markers).
 *
 * @private chats
 */
export type ChatStatus = 'open' | 'waiting-for-user' | 'resolved';

/**
 * Valid chat states.
 */
const CHAT_STATUSES: readonly ChatStatus[] = ['open', 'waiting-for-user', 'resolved'];

/**
 * One durable message.
 *
 * @private chats
 */
export type ChatMessage = {
    /** Sender reference as written (`@User`, `@Developer`, `{Frontend Developer}`). */
    readonly sender: string;
    /** Normalized sender name. */
    readonly senderKey: string;
    /** Timestamp of the turn (not an ID; duplicates are possible). */
    readonly at: string;
    /** Complete text (lossless). */
    readonly text: string;
    /** Predefined answers offered by an agent message. */
    readonly choices?: readonly string[];
    /**
     * `progress`: an interim update of a turn (collapsed into Thinking once its final reply exists); `final`: the reply
     * that ends a turn which had progress. An ordinary message has no phase.
     */
    readonly phase?: ChatMessagePhase;
};

/**
 * Phase of a message within an agent's turn.
 *
 * @private chats
 */
export type ChatMessagePhase = 'progress' | 'final';

/**
 * A parsed chat Book.
 *
 * @private chats
 */
export type ChatBook = {
    /** Declared name (the opening `CHAT` line): the chat's identity. */
    readonly name: string;
    /** Normalized name. */
    readonly key: string;
    /** The latest valid `CHAT TITLE` (presentation only; the name stays the identity). */
    readonly title?: string;
    /** Participant references in declaration order (the first agent is the main agent). */
    readonly members: readonly string[];
    /** Durable action state. */
    readonly status: ChatStatus;
    /** Directed references to other Books (`{Task name}`). */
    readonly links: readonly string[];
    /** Messages in source order. */
    readonly messages: readonly ChatMessage[];
    /**
     * The conversation's resolved execution (its last MODEL, recorded after the first User message and before the
     * first agent reply); unconstrained until routed.
     */
    readonly model: ModelConstraint;
    /** Problems of the source. */
    readonly diagnostics: readonly BookDiagnostic[];
};

/**
 * Marker of an agent-offered answer line inside a message (user text starting with it is always escaped).
 */
const CHOICE_PREFIX = '» ';

/**
 * Maximal number of answers an agent message may offer.
 */
const MAX_CHOICES = 50;

/**
 * Maximal length of one offered answer.
 */
const MAX_CHOICE_LENGTH = 1000;

/**
 * Validates offered answers: unique, readable, single-line, nonempty strings within the limits.
 *
 * @private chats
 */
export function validateChoices(choices: unknown): string | undefined {
    if (choices === undefined || choices === null) return undefined;
    if (!Array.isArray(choices)) return 'Offered answers must be a list of strings.';
    if (choices.length > MAX_CHOICES) return `At most ${MAX_CHOICES} offered answers are allowed.`;
    const seen = new Set<string>();
    for (const choice of choices) {
        if (typeof choice !== 'string') return 'Every offered answer must be a string.';
        if (choice.length > MAX_CHOICE_LENGTH) return `An offered answer exceeds ${MAX_CHOICE_LENGTH} characters.`;
        if (/[\r\n]/.test(choice)) return 'An offered answer must be a single line.';
        // eslint-disable-next-line no-control-regex
        if (!choice.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, '')) return 'An offered answer must contain readable text.';
        if (choice.trim() !== choice) return `The offered answer "${choice}" has surrounding whitespace.`;
        if (seen.has(choice)) return `Duplicate offered answer "${choice}".`;
        seen.add(choice);
    }
    return undefined;
}

/**
 * Whether a message line must be escaped so it stays literal text (commitments, fences, escapes, choice markers).
 */
function needsEscape(line: string): boolean {
    return line.startsWith('»') || needsLiteralEscape(line);
}

/**
 * Renders one message block: header, escaped text, offered choices and a separating blank line.
 *
 * @private chats
 */
export function renderChatMessage(message: Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices' | 'phase'>): string[] {
    const body = message.text.replace(/\r\n?/g, '\n').split('\n').map((line) => (needsEscape(line) ? `\\${line}` : line));
    return [`CHAT MESSAGE ${message.sender} ${message.at}${message.phase ? ` ${message.phase}` : ''}`, ...body, ...(message.choices ?? []).map((choice) => `${CHOICE_PREFIX}${choice.replace(/\s*\n\s*/g, ' ')}`), ''];
}

/**
 * Renders a new chat Book. A new chat is implicitly open: no initial `CHAT STATUS open` is written; another initial
 * state (e.g. an agent's question waiting for the user) is appended after the messages that caused it.
 *
 * @private chats
 */
export function renderChatBook(chat: { name: string; members: readonly string[]; status: ChatStatus; links?: readonly string[]; messages?: ReadonlyArray<Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices'>> }): string {
    const lines = [renderDeclaration('chat', chat.name), ...chat.members.map((member) => `CHAT MEMBER ${member}`), ...(chat.links ?? []).map((link) => `LINK ${link}`), ''];
    for (const message of chat.messages ?? []) lines.push(...renderChatMessage(message));
    const source = `${lines.join('\n')}\n`;
    return chat.status === 'open' ? source : setChatStatus(source, chat.status);
}

/**
 * Appends a message (and optionally the status transition it causes) to a chat source without touching earlier
 * content.
 *
 * @private chats
 */
export function appendChatMessage(source: string, message: Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices' | 'phase'>, status?: ChatStatus): string {
    const base = source.endsWith('\n') ? source : `${source}\n`;
    const text = `${base}${renderChatMessage(message).join('\n')}\n`;
    return status ? setChatStatus(text, status) : text;
}

/**
 * Re-renders one existing message (by its position among the messages) in place: a reply's progress stays one
 * durable message that grows, instead of a new message per update. Everything else stays byte-for-byte intact.
 *
 * @private chats
 */
export function replaceChatMessage(source: string, index: number, message: Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices' | 'phase'>): string {
    const document = parseBook(source);
    const target = commitmentsOf(document, 'CHAT MESSAGE')[index];
    if (!target) throw new Error(`No message ${index + 1} to replace.`);
    const lines = source.split('\n');
    const rendered = renderChatMessage(message);
    if (target.endLine >= lines.length) return `${lines.slice(0, target.startLine).join('\n')}${target.startLine ? '\n' : ''}${rendered.join('\n')}\n`;
    return [...lines.slice(0, target.startLine), ...rendered, ...lines.slice(target.endLine)].join('\n');
}

/**
 * Appends single-line commitments (a joining `CHAT MEMBER`, a `LINK`, a new `CHAT TITLE`) at their chronological
 * position, after everything so far, without touching earlier content.
 *
 * @private chats
 */
export function appendChatCommitments(source: string, lines: readonly string[]): string {
    if (!lines.length) return source;
    const base = source.endsWith('\n') ? source : `${source}\n`;
    // The separating blank line of a final message stays its own; commitments follow it.
    return `${base}${lines.map((line) => line.replace(/[\r\n]+/g, ' ')).join('\n')}\n`;
}

/**
 * Whether a participant reference is already a member (normalized; re-adding is idempotent).
 *
 * @private chats
 */
export function hasMember(chat: Pick<ChatBook, 'members'>, reference: string): boolean {
    const key = parseReferenceValue(reference)?.normalized ?? normalizeAgentName(reference);
    return chat.members.some((member) => parseReferenceValue(member)?.normalized === key);
}

/**
 * The human-facing presentation title: the latest `CHAT TITLE`, or the declared name without one.
 *
 * @private chats
 */
export function chatDisplayTitle(chat: Pick<ChatBook, 'name' | 'title'>): string {
    return chat.title ?? chat.name;
}

/**
 * Records a durable status transition of a chat source under [Book layering](specs/book-language/layering.md): a
 * new `CHAT STATUS` is appended at the current chronological position, earlier status commitments stay as history and
 * everything else stays byte-for-byte intact. An unchanged state (including the implicit open of a chat without any
 * status) appends nothing.
 *
 * @private chats
 */
export function setChatStatus(source: string, status: ChatStatus): string {
    if (effectiveChatStatus(parseBook(source)).status === status) return source;
    return appendChatCommitments(source, [`CHAT STATUS ${status}`]);
}

/**
 * The effective durable state of a chat document: the last valid `CHAT STATUS` (absence means open), with diagnostics
 * for invalid values. Literal text inside messages is never a commitment.
 */
function effectiveChatStatus(document: BookDocument): { status: ChatStatus; diagnostics: BookDiagnostic[] } {
    const diagnostics: BookDiagnostic[] = [];
    let status: ChatStatus = 'open';
    for (const commitment of commitmentsOf(document, 'CHAT STATUS')) {
        const value = commitment.value.split('\n')[0]!.trim();
        if ((CHAT_STATUSES as readonly string[]).includes(value)) status = value as ChatStatus;
        else diagnostics.push({ line: commitment.startLine + 1, message: `CHAT STATUS must be open, waiting-for-user or resolved, not "${value}".`, severity: 'error' });
    }
    return { status, diagnostics };
}

/**
 * Reads a chat Book (lossless message text, choices and links).
 *
 * @private chats
 */
export function parseChatBook(source: string): ChatBook {
    const document = parseBook(source);
    const diagnostics: BookDiagnostic[] = [...document.diagnostics];
    if (document.kind !== 'chat' && document.kind !== 'empty' && !document.legacy?.plainHeader) diagnostics.push({ line: document.headerLine + 1, message: 'This Book is not a chat (it must start with `CHAT <name>`).', severity: 'error' });
    const members = commitmentsOf(document, 'CHAT MEMBER').map((commitment) => commitment.value.trim());
    for (const member of members) if (!parseReferenceValue(member)) diagnostics.push({ line: 0, message: `CHAT MEMBER ${invalidReferenceMessage(member)}`, severity: 'error' });
    // Chronological transitions: the last valid status wins, earlier ones stay as history (absence means open).
    const { status, diagnostics: statusDiagnostics } = effectiveChatStatus(document);
    diagnostics.push(...statusDiagnostics);
    const modelResult = modelOfDocument(document, { multiple: 'last' });
    diagnostics.push(...modelResult.diagnostics);
    const messageCommitments = commitmentsOf(document, 'CHAT MESSAGE');
    const messages: ChatMessage[] = [];
    for (const commitment of messageCommitments) {
        const header = /^(\{[^{}]+\}|@\S+)\s+(\S+)(?:\s+(progress|final))?$/.exec(commitment.value.trim());
        if (!header) {
            diagnostics.push({ line: commitment.startLine + 1, message: 'A CHAT MESSAGE needs `<sender> <timestamp>`, optionally followed by `progress` or `final`.', severity: 'error' });
            continue;
        }
        const isLast = commitment === messageCommitments[messageCommitments.length - 1] && commitment.endLine === document.lines.length;
        const raw = document.lines.slice(commitment.startLine + 1, commitment.endLine);
        // Exactly one separating blank line (two at the end of the file) belongs to the format, not the text.
        for (let strip = isLast ? 2 : 1; strip > 0 && raw.length && raw[raw.length - 1] === ''; strip--) raw.pop();
        const choices: string[] = [];
        while (raw.length && raw[raw.length - 1]!.startsWith(CHOICE_PREFIX)) choices.unshift(raw.pop()!.slice(CHOICE_PREFIX.length));
        const text = raw.map((line) => (line.startsWith('\\') ? line.slice(1) : line)).join('\n');
        const sender = header[1]!;
        const phase = header[3] as ChatMessagePhase | undefined;
        messages.push({ sender, senderKey: parseReferenceValue(sender)?.normalized ?? normalizeAgentName(sender), at: header[2]!, text, choices: choices.length ? choices : undefined, ...(phase ? { phase } : {}) });
    }
    // The latest valid title wins; earlier ones stay in the Book as its history.
    const titles = commitmentsOf(document, 'CHAT TITLE').map((commitment) => commitment.value.split('\n')[0]!.trim());
    for (const commitment of commitmentsOf(document, 'CHAT TITLE')) if (!commitment.value.split('\n')[0]!.trim()) diagnostics.push({ line: commitment.startLine + 1, message: 'CHAT TITLE needs a nonempty single-line title.', severity: 'warning' });
    const title = titles.filter(Boolean).at(-1);
    return {
        name: document.name,
        key: normalizeAgentName(document.name),
        ...(title ? { title } : {}),
        members,
        status,
        links: commitmentsOf(document, 'LINK').map((commitment) => commitment.value.trim()),
        messages,
        model: modelResult.constraint,
        diagnostics,
    };
}

/**
 * Appends the conversation's resolved MODEL at its chronological position (after the messages so far), without
 * touching earlier content.
 *
 * @private chats
 */
export function appendChatModel(source: string, model: ModelConstraint): string {
    const base = source.endsWith('\n') ? source : `${source}\n`;
    return `${base}${renderModelLines(model).join('\n')}\n\n`;
}

/**
 * The main agent of a human-facing chat: its first agent member (the initially selected agent). Joined agents speak
 * under their own names but never replace it.
 *
 * @private chats
 */
export function chatAgent(chat: Pick<ChatBook, 'members'>): string | undefined {
    return chatAgents(chat)[0];
}

/**
 * Every agent participant of a chat in declaration order (the first is the main agent).
 *
 * @private chats
 */
export function chatAgents(chat: Pick<ChatBook, 'members'>): string[] {
    return chat.members.filter((member) => parseReferenceValue(member)?.normalized !== 'user');
}

/**
 * Whether the chat has the User as a participant.
 *
 * @private chats
 */
export function isHumanFacing(chat: Pick<ChatBook, 'members'>): boolean {
    return chat.members.some((member) => parseReferenceValue(member)?.normalized === 'user');
}

/**
 * Whether the user's latest message still waits for an agent reply. Progress of an interrupted or failed turn (left
 * explicitly unfinished) does not answer it; only an ordinary or final message does.
 *
 * @private chats
 */
export function awaitsReply(chat: { readonly messages: ReadonlyArray<Pick<ChatMessage, 'sender' | 'phase'>> }): boolean {
    for (let index = chat.messages.length - 1; index >= 0; index--) {
        const message = chat.messages[index]!;
        if (message.phase !== 'progress') return parseReferenceValue(message.sender)?.normalized === 'user';
    }
    return false;
}

/**
 * Reference form of a participant name.
 *
 * @private chats
 */
export function memberReference(name: string): string {
    return formatAgentReference(name);
}

/**
 * One item of a presented conversation: a message, or the interim progress of a turn that a final reply closed,
 * collapsed into Thinking with the real elapsed time (the complete messages stay in the Book and can be expanded).
 *
 * @private chats
 */
export type ThreadItem =
    | { readonly kind: 'message'; readonly message: Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices' | 'phase'> }
    | { readonly kind: 'thinking'; readonly sender: string; readonly elapsedMs?: number; readonly messages: ReadonlyArray<Pick<ChatMessage, 'sender' | 'at' | 'text' | 'phase'>> };

/**
 * Collapses each final reply's preceding progress messages (same sender, since its previous ordinary message) into one
 * Thinking item placed where the progress began. Progress without a final reply (in progress or unfinished) stays as
 * it is. No message count is shown; the elapsed time is measured from the first progress to the final reply.
 *
 * @private chats
 */
export function collapseThinking(messages: ReadonlyArray<Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices' | 'phase'>>): ThreadItem[] {
    const key = (sender: string): string => parseReferenceValue(sender)?.normalized ?? normalizeAgentName(sender);
    const groups = new Map<number, number[]>();
    const collapsed = new Set<number>();
    messages.forEach((message, index) => {
        if (message.phase !== 'final') return;
        const members: number[] = [];
        for (let previous = index - 1; previous >= 0; previous--) {
            const candidate = messages[previous]!;
            if (key(candidate.sender) !== key(message.sender)) continue;
            if (candidate.phase !== 'progress') break;
            members.unshift(previous);
        }
        if (!members.length) return;
        groups.set(members[0]!, members);
        for (const member of members) collapsed.add(member);
    });
    const items: ThreadItem[] = [];
    messages.forEach((message, index) => {
        const group = groups.get(index);
        if (group) {
            const final = messages.slice(group[group.length - 1]! + 1).find((candidate) => candidate.phase === 'final' && key(candidate.sender) === key(message.sender));
            const elapsed = final ? Date.parse(final.at) - Date.parse(message.at) : NaN;
            items.push({ kind: 'thinking', sender: message.sender, ...(Number.isFinite(elapsed) && elapsed >= 0 ? { elapsedMs: elapsed } : {}), messages: group.map((member) => messages[member]!) });
            return;
        }
        if (!collapsed.has(index)) items.push({ kind: 'message', message });
    });
    return items;
}
