import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { commitmentsOf, parseBook, type BookCommitment, type BookDiagnostic, type BookDocument } from '../book/parse.js';

/**
 * Canonical keyword binding recorded speech to the message right before it.
 *
 * @private chat message audio
 */
export const MESSAGE_AUDIO_KEYWORD = 'CHAT MESSAGE AUDIO';

/**
 * State of one recorded segment: `complete` (the default), `interrupted` (only the part actually heard before a
 * deliberate cutoff) or `incomplete` (truncated or failed capture). It describes the recording, never task success.
 *
 * @private chat message audio
 */
export type MessageAudioStatus = 'complete' | 'interrupted' | 'incomplete';

/**
 * Valid segment states.
 */
const AUDIO_STATUSES: readonly MessageAudioStatus[] = ['complete', 'interrupted', 'incomplete'];

/**
 * Position of a segment on its call's shared monotonic timeline (not a file-seek range or wall-clock time).
 *
 * @private chat message audio
 */
export type MessageAudioTiming = {
    /** Nonsecret technical call correlation inside the owning chat. */
    readonly call: string;
    /** Offset of the segment start in milliseconds. */
    readonly startMs: number;
    /** Offset of the segment end in milliseconds (never before the start). */
    readonly endMs: number;
};

/**
 * One recorded segment of a message: another representation of the same utterance, never another message, speaker,
 * attachment or instruction.
 *
 * @private chat message audio
 */
export type MessageAudio = {
    /** Project-root-relative path of the recorded asset (`/` separators). */
    readonly path: string;
    /** Recording state (`complete` when omitted in the source). */
    readonly status: MessageAudioStatus;
    /** Shared call timing; absent means unknown (never proof that speakers did not overlap). */
    readonly timing?: MessageAudioTiming;
};

/**
 * Keys of the JSON record.
 */
const RECORD_KEYS = new Set(['path', 'status', 'call', 'startMs', 'endMs']);

/**
 * Why a project-root-relative asset path is unsafe or malformed, if it is (absolute, `\` separators, empty, `.` or
 * `..` segments, drive letters or control characters). Spaces and Unicode are ordinary path text.
 *
 * @private chat message audio
 */
export function unsafeAudioPath(path: unknown): string | undefined {
    if (typeof path !== 'string' || !path.trim()) return 'needs a nonempty `path`';
    if (path.includes('\\')) return 'must use `/` separators in `path`';
    if (path.startsWith('/') || /^[a-z]:/i.test(path) || isAbsolute(path)) return 'needs a project-root-relative `path`, not an absolute one';
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(path)) return 'has control characters in `path`';
    const segments = path.split('/');
    if (segments.some((segment) => segment === '..')) return 'cannot leave the project (`..` in `path`)';
    if (segments.some((segment) => segment === '' || segment === '.')) return 'has an empty or `.` segment in `path`';
    return undefined;
}

/**
 * Reads the JSON record of one `CHAT MESSAGE AUDIO` commitment. Keys and strings are typed metadata: nothing in them
 * is a reference, an invitation or executable chat content.
 *
 * @private chat message audio
 */
export function parseMessageAudio(value: string): { readonly audio?: MessageAudio; readonly error?: string; readonly warning?: string } {
    let record: unknown;
    try {
        record = JSON.parse(value);
    } catch {
        return { error: 'needs one JSON object, for example `{"path":"chats/_assets/…/user-1.webm"}`' };
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) return { error: 'needs one JSON object' };
    const fields = record as Record<string, unknown>;
    const pathProblem = unsafeAudioPath(fields.path);
    if (pathProblem) return { error: pathProblem };
    const status = fields.status === undefined ? 'complete' : fields.status;
    if (typeof status !== 'string' || !(AUDIO_STATUSES as readonly string[]).includes(status)) return { error: '`status` must be `complete`, `interrupted` or `incomplete`' };
    const timingKeys = (['call', 'startMs', 'endMs'] as const).filter((key) => fields[key] !== undefined);
    let timing: MessageAudioTiming | undefined;
    if (timingKeys.length) {
        if (timingKeys.length !== 3) return { error: '`call`, `startMs` and `endMs` must appear together' };
        const { call, startMs, endMs } = fields;
        if (typeof call !== 'string' || !call.trim()) return { error: '`call` must be a nonempty string' };
        if (typeof startMs !== 'number' || typeof endMs !== 'number' || !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs < 0) return { error: '`startMs` and `endMs` must be finite nonnegative milliseconds' };
        if (startMs > endMs) return { error: '`startMs` must not be after `endMs`' };
        timing = { call, startMs, endMs };
    }
    const unknown = Object.keys(fields).filter((key) => !RECORD_KEYS.has(key));
    return { audio: { path: fields.path as string, status: status as MessageAudioStatus, ...(timing ? { timing } : {}) }, ...(unknown.length ? { warning: `has unknown keys (${unknown.join(', ')}), which are preserved without effect` } : {}) };
}

/**
 * The commitment line of one segment (`complete` and unknown timing are omitted).
 *
 * @private chat message audio
 */
export function renderMessageAudio(audio: MessageAudio): string {
    const record = { path: audio.path, ...(audio.timing ? { call: audio.timing.call, startMs: Math.round(audio.timing.startMs), endMs: Math.round(audio.timing.endMs) } : {}), ...(audio.status !== 'complete' ? { status: audio.status } : {}) };
    return `${MESSAGE_AUDIO_KEYWORD} ${JSON.stringify(record)}`;
}

/**
 * Audio groups of a parsed chat document: each `CHAT MESSAGE AUDIO` binds to the exact `CHAT MESSAGE` immediately
 * before its group (consecutive audio commitments after one message body), in order. Anything else between them
 * closes the group; ownership is never guessed from speaker, timestamp or proximity.
 *
 * @private chat message audio
 */
export function messageAudioGroups(document: BookDocument): { readonly groups: ReadonlyMap<BookCommitment, readonly MessageAudio[]>; readonly diagnostics: readonly BookDiagnostic[] } {
    const groups = new Map<BookCommitment, MessageAudio[]>();
    const diagnostics: BookDiagnostic[] = [];
    let owner: BookCommitment | undefined;
    for (const commitment of document.commitments) {
        if (commitment.keyword === 'CHAT MESSAGE') {
            owner = commitment;
            continue;
        }
        if (commitment.keyword !== MESSAGE_AUDIO_KEYWORD) {
            owner = undefined;
            continue;
        }
        const line = commitment.startLine + 1;
        if (!owner) {
            diagnostics.push({ line, message: `${MESSAGE_AUDIO_KEYWORD} must directly follow the CHAT MESSAGE it records (or another audio line of it); it is kept without a binding.`, severity: 'error' });
            continue;
        }
        if (commitment.continuation) diagnostics.push({ line: line + 1, message: `${MESSAGE_AUDIO_KEYWORD} takes one JSON line; the text below it belongs to no message.`, severity: 'warning' });
        const parsed = parseMessageAudio(commitment.value);
        if (!parsed.audio) {
            diagnostics.push({ line, message: `${MESSAGE_AUDIO_KEYWORD} ${parsed.error ?? 'is invalid'}; the message keeps its text without this audio.`, severity: 'error' });
            continue;
        }
        if (parsed.warning) diagnostics.push({ line, message: `${MESSAGE_AUDIO_KEYWORD} ${parsed.warning}.`, severity: 'warning' });
        groups.set(owner, [...(groups.get(owner) ?? []), parsed.audio]);
    }
    return { groups, diagnostics };
}

/**
 * Adds finalized segments to the audio group of one existing message (0-based position among the messages): after
 * its last audio line, or right after its body. No message, event or earlier text moves, so audio finalized after a
 * later reply still belongs to its originating message. A segment whose path is already bound to that message is
 * not added twice (reconnect/finalization replay).
 *
 * @private chat message audio
 */
export function appendMessageAudio(source: string, index: number, segments: readonly MessageAudio[]): string {
    const document = parseBook(source);
    const messages = commitmentsOf(document, 'CHAT MESSAGE');
    const target = messages[index];
    if (!target) throw new Error(`No message ${index + 1} to bind audio to.`);
    const existing = messageAudioGroups(document).groups.get(target) ?? [];
    const fresh = segments.filter((segment, position) => !existing.some((audio) => audio.path === segment.path) && segments.findIndex((other) => other.path === segment.path) === position);
    if (!fresh.length) return source;
    // The group ends at the last consecutive audio commitment after the message.
    const at = document.commitments.indexOf(target);
    let last = target;
    for (const commitment of document.commitments.slice(at + 1)) {
        if (commitment.keyword !== MESSAGE_AUDIO_KEYWORD) break;
        last = commitment;
    }
    const lines = source.split('\n');
    const rendered = fresh.map(renderMessageAudio);
    // After the message's separating blank line (which stays the message's own, so its text is unchanged) or after the
    // group's last audio line; the next commitment follows unchanged.
    const insert = last === target ? target.endLine : last.startLine + 1;
    if (insert >= lines.length) return `${source.endsWith('\n') ? source : `${source}\n`}${rendered.join('\n')}\n`;
    return [...lines.slice(0, insert), ...rendered, ...lines.slice(insert)].join('\n');
}

/**
 * Short presentation of a message's recorded speech, distinct from attachment chips: `audio available`, or the honest
 * interrupted/incomplete state (with the number of segments when there are several). Replaying it is inspection only.
 *
 * @private chat message audio
 */
export function messageAudioLabel(audio: readonly Pick<MessageAudio, 'status'>[] | undefined): string | undefined {
    if (!audio?.length) return undefined;
    const state = audio.some((segment) => segment.status === 'incomplete') ? 'audio incomplete' : audio.some((segment) => segment.status === 'interrupted') ? 'audio interrupted' : 'audio available';
    return audio.length > 1 ? `${state} · ${audio.length} segments` : state;
}

/**
 * Resolves a bound asset inside the project: the relative path must stay inside the root even after following
 * symlinks (a link escaping the project is refused). Returns the absolute path of an existing regular file.
 *
 * @private chat message audio
 */
export async function resolveMessageAudio(projectRoot: string, path: string): Promise<string> {
    const problem = unsafeAudioPath(path);
    if (problem) throw new Error(`The audio path ${problem}.`);
    const absolute = join(projectRoot, ...path.split('/'));
    const [root, real] = await Promise.all([realpath(projectRoot), realpath(absolute)]);
    const inside = relative(root, real);
    if (!inside || inside.startsWith('..') || isAbsolute(inside) || inside.split(sep)[0] === '..') throw new Error(`The audio ${path} points outside the project.`);
    if (!(await lstat(real)).isFile()) throw new Error(`The audio ${path} is not a file.`);
    return real;
}
