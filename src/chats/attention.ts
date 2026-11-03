import { join } from 'node:path';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { Mutex } from '../common/mutex.js';

/**
 * One attention occurrence of a chat: an explicit `+@User` / `+{User}` ping in an accepted agent message (or, for a
 * question written before pings existed, its awaited message). Seen and resolved are separate facts: seeing removes
 * the alert but never answers, approves or releases the waiting work.
 *
 * @private chat attention
 */
export type ChatPing = {
    /** Stable identity: the normalized chat and the message's 1-based position (`<chat key>#<message>`). */
    readonly id: string;
    /** Declared name of the chat when the ping was accepted. */
    readonly chat: string;
    /** Normalized chat name. */
    readonly key: string;
    /** 1-based position of the calling message in its chat. */
    readonly message: number;
    /** Author of the calling message. */
    readonly sender: string;
    /** When the ping was accepted (ISO). */
    readonly at: string;
    /** When the calling message was actually displayed to an active viewer (shared by every client). */
    readonly seenAt?: string;
    /** When a saved response (or a settled request) cleared it. */
    readonly resolvedAt?: string;
    /** A legacy waiting question without the literal prefix: recorded only once it was seen or resolved. */
    readonly implicit?: true;
};

/**
 * Format of the shared attention file.
 */
type AttentionFile = { readonly version: 1; readonly pings: readonly ChatPing[] };

/**
 * One lock per attention file, shared by every store of this process (the engine's and a local client's).
 */
const LOCKS = new Map<string, Mutex>();

/**
 * Durable, project-shared attention state of chats (`.ptbk/state/attention.json`): which explicit User pings exist
 * and which of them were seen or resolved. It is runtime state of the project (never committed, never a Book entity),
 * survives restarts and is the same for every client; the temporary sounds/notifications preference is not part of it.
 *
 * @private chat attention
 */
export class ChatAttention {
    private readonly file: string;
    private readonly mutex: Mutex;

    public constructor(stateDirectory: string) {
        this.file = join(stateDirectory, 'attention.json');
        this.mutex = LOCKS.get(this.file) ?? new Mutex();
        LOCKS.set(this.file, this.mutex);
    }

    /** Every retained occurrence. */
    public async list(): Promise<ChatPing[]> {
        const file = await readJsonIfExists<AttentionFile>(this.file).catch(() => undefined);
        return Array.isArray(file?.pings) ? [...file.pings] : [];
    }

    /**
     * Records the ping of a newly accepted message once: recording the same chat position again (a retried send, a
     * recovered wait, a replayed history) changes nothing. Returns whether a new occurrence was created.
     */
    public async record(input: { readonly chat: string; readonly key: string; readonly message: number; readonly sender: string; readonly at?: string }): Promise<boolean> {
        return await this.update((pings) => {
            const id = pingId(input.key, input.message);
            if (pings.some((ping) => ping.id === id)) return false;
            pings.push({ id, chat: input.chat, key: input.key, message: input.message, sender: input.sender, at: input.at ?? new Date().toISOString() });
            return true;
        });
    }

    /**
     * Marks the given messages of a chat seen. `candidates` are the occurrences a client could currently see (explicit
     * and legacy implicit ones); only those are touched, so a stale or invented position never creates state.
     * Returns how many occurrences became seen.
     */
    public async markSeen(candidates: readonly Pick<ChatPing, 'id' | 'chat' | 'key' | 'message' | 'sender' | 'at' | 'implicit'>[]): Promise<number> {
        if (!candidates.length) return 0;
        const now = new Date().toISOString();
        return await this.update((pings) => {
            let changed = 0;
            for (const candidate of candidates) {
                const index = pings.findIndex((ping) => ping.id === candidate.id);
                if (index < 0) {
                    pings.push({ ...candidate, seenAt: now, ...(candidate.implicit ? { implicit: true as const } : {}) });
                    changed++;
                } else if (!pings[index]!.seenAt && !pings[index]!.resolvedAt) {
                    pings[index] = { ...pings[index]!, seenAt: now };
                    changed++;
                }
            }
            return changed;
        });
    }

    /**
     * Resolves the outstanding occurrences of a chat that `applies` selects (a saved answer, or the question no longer
     * waiting). Returns how many were resolved.
     */
    public async resolve(key: string, applies: (ping: ChatPing) => boolean, implicit: readonly Pick<ChatPing, 'id' | 'chat' | 'key' | 'message' | 'sender' | 'at'>[] = []): Promise<number> {
        const now = new Date().toISOString();
        return await this.update((pings) => {
            let changed = 0;
            for (const [index, ping] of pings.entries()) {
                if (ping.key !== key || ping.resolvedAt || !applies(ping)) continue;
                pings[index] = { ...ping, resolvedAt: now };
                changed++;
            }
            // A legacy question answered before it was ever seen: remember that it is answered.
            for (const candidate of implicit) {
                if (pings.some((ping) => ping.id === candidate.id) || !applies(candidate as ChatPing)) continue;
                pings.push({ ...candidate, resolvedAt: now, implicit: true });
                changed++;
            }
            return changed;
        });
    }

    /** Saves a change under the shared lock; acknowledgements cannot expire while their Books still exist. */
    private async update<T extends boolean | number>(change: (pings: ChatPing[]) => T): Promise<T> {
        return await this.mutex.run(async () => {
            const pings = await this.list();
            const result = change(pings);
            if (result) {
                await ensureDirectory(join(this.file, '..'));
                await writeJsonAtomic(this.file, { version: 1, pings } satisfies AttentionFile);
            }
            return result;
        });
    }
}

/**
 * Identity of the occurrence of one chat position.
 *
 * @private chat attention
 */
export function pingId(key: string, message: number): string {
    return `${key}#${message}`;
}
