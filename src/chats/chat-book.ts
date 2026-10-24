import { modelOfDocument, renderModelLines, type ModelConstraint } from '../book/model.js';
import { commitmentsOf, parseBook, singleValue, type BookDiagnostic } from '../book/parse.js';
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
};

/**
 * A parsed chat Book.
 *
 * @private chats
 */
export type ChatBook = {
    /** Display name (first line): the chat's identity. */
    readonly name: string;
    /** Normalized name. */
    readonly key: string;
    /** Participant references. */
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
export function renderChatMessage(message: Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices'>): string[] {
    const body = message.text.replace(/\r\n?/g, '\n').split('\n').map((line) => (needsEscape(line) ? `\\${line}` : line));
    return [`CHAT MESSAGE ${message.sender} ${message.at}`, ...body, ...(message.choices ?? []).map((choice) => `${CHOICE_PREFIX}${choice.replace(/\s*\n\s*/g, ' ')}`), ''];
}

/**
 * Renders a new chat Book.
 *
 * @private chats
 */
export function renderChatBook(chat: { name: string; members: readonly string[]; status: ChatStatus; links?: readonly string[]; messages?: ReadonlyArray<Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices'>> }): string {
    const lines = [renderDeclaration('chat', chat.name), ...chat.members.map((member) => `CHAT MEMBER ${member}`), `CHAT STATUS ${chat.status}`, ...(chat.links ?? []).map((link) => `LINK ${link}`), ''];
    for (const message of chat.messages ?? []) lines.push(...renderChatMessage(message));
    return `${lines.join('\n')}\n`;
}

/**
 * Appends a message (and optionally the new status) to a chat source without touching earlier content.
 *
 * @private chats
 */
export function appendChatMessage(source: string, message: Pick<ChatMessage, 'sender' | 'at' | 'text' | 'choices'>, status?: ChatStatus): string {
    const base = source.endsWith('\n') ? source : `${source}\n`;
    const text = `${base}${renderChatMessage(message).join('\n')}\n`;
    return status ? setChatStatus(text, status) : text;
}

/**
 * Sets the durable status of a chat source, changing only that line (earlier messages stay byte-for-byte intact).
 *
 * @private chats
 */
export function setChatStatus(source: string, status: ChatStatus): string {
    const document = parseBook(source);
    const lines = source.split('\n');
    const existing = document.commitments.find((commitment) => commitment.keyword === 'CHAT STATUS');
    if (existing) {
        const carriage = lines[existing.startLine]!.endsWith('\r') ? '\r' : '';
        lines[existing.startLine] = `CHAT STATUS ${status}${carriage}`;
        return lines.join('\n');
    }
    const anchor = [...document.commitments].filter((commitment) => commitment.keyword === 'CHAT MEMBER').pop();
    lines.splice(anchor ? anchor.startLine + 1 : document.headerLine + 1, 0, `CHAT STATUS ${status}`);
    return lines.join('\n');
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
    const statusValue = singleValue(document, 'CHAT STATUS');
    if (statusValue.conflict) diagnostics.push(statusValue.conflict);
    const status = (CHAT_STATUSES as readonly string[]).includes(statusValue.value ?? 'open') ? ((statusValue.value ?? 'open') as ChatStatus) : 'open';
    if (statusValue.value && !(CHAT_STATUSES as readonly string[]).includes(statusValue.value)) diagnostics.push({ line: 0, message: `CHAT STATUS must be open, waiting-for-user or resolved, not "${statusValue.value}".`, severity: 'error' });
    const modelResult = modelOfDocument(document, { multiple: 'last' });
    diagnostics.push(...modelResult.diagnostics);
    const messageCommitments = commitmentsOf(document, 'CHAT MESSAGE');
    const messages: ChatMessage[] = [];
    for (const commitment of messageCommitments) {
        const header = /^(\{[^{}]+\}|@\S+)\s+(\S+)$/.exec(commitment.value.trim());
        if (!header) {
            diagnostics.push({ line: commitment.startLine + 1, message: 'A CHAT MESSAGE needs `<sender> <timestamp>`.', severity: 'error' });
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
        messages.push({ sender, senderKey: parseReferenceValue(sender)?.normalized ?? normalizeAgentName(sender), at: header[2]!, text, choices: choices.length ? choices : undefined });
    }
    return {
        name: document.name,
        key: normalizeAgentName(document.name),
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
 * The agent participant of a human-facing chat (the non-User member), when there is exactly one.
 *
 * @private chats
 */
export function chatAgent(chat: Pick<ChatBook, 'members'>): string | undefined {
    const agents = chat.members.filter((member) => parseReferenceValue(member)?.normalized !== 'user');
    return agents.length === 1 ? agents[0] : undefined;
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
 * Reference form of a participant name.
 *
 * @private chats
 */
export function memberReference(name: string): string {
    return formatAgentReference(name);
}
