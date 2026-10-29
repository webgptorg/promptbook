import { open, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { renderDeclaration } from '../book/write.js';
import { errorMessage } from '../common/errors.js';
import { writeFileAtomic } from '../common/fs.js';
import { appendChatMessage, parseChatBook } from '../chats/chat-book.js';

/**
 * Root Book of Chatter's project briefs: an explicit Chat exception with a stable undated name and root location.
 *
 * @private project report
 */
export const REPORT_FILE = 'report.book';

/**
 * Stable declared name of the report Chat.
 *
 * @private project report
 */
export const REPORT_NAME = 'Report';

/**
 * The only member and author of the report feed.
 *
 * @private project report
 */
export const REPORT_AUTHOR = '@Chatter';

/**
 * Largest tail read to find the latest brief (the feed is never read or rendered whole for this).
 */
const TAIL_BYTES = 256 * 1024;

/**
 * One saved brief: Chatter's paragraph and its original generation time.
 *
 * @private project report
 */
export type ProjectBrief = { readonly text: string; readonly at: string };

/**
 * The saved report as every client reads it: the latest complete brief, plus honest availability and the shared
 * generation state (reading never generates).
 *
 * @private project report
 */
export type ReportView = {
    readonly path: typeof REPORT_FILE;
    /** `available`: a brief exists; `missing`: no report or no brief yet; `unreadable`: the Book cannot be read/parsed. */
    readonly state: 'available' | 'missing' | 'unreadable';
    readonly brief?: ProjectBrief;
    readonly problem?: string;
    /** A brief is being generated now (the saved one stays readable meanwhile). */
    readonly generating?: boolean;
    /** An explicit Refresh waits for background scheduling (pause, capacity). */
    readonly requestedAt?: string;
    /** Why the requested or automatic generation waits, when it does. */
    readonly waiting?: string;
};

/**
 * Source of a new, empty report Book (`CHAT Report`, Chatter alone).
 *
 * @private project report
 */
export function newReportBook(): string {
    return `${renderDeclaration('chat', REPORT_NAME)}\nCHAT MEMBER ${REPORT_AUTHOR}\n\n`;
}

/**
 * The latest complete Chatter brief of a report Book source (progress or empty messages never replace it).
 *
 * @private project report
 */
export function latestBriefOf(source: string): ProjectBrief | undefined {
    const messages = parseChatBook(source).messages;
    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index]!;
        if (message.senderKey === 'chatter' && message.phase !== 'progress' && message.text.trim()) return { text: message.text.trim(), at: message.at };
    }
    return undefined;
}

/**
 * Reads the latest saved brief from root `report.book`, parsing only its tail through the common Book model (a very
 * long feed is never parsed or rendered whole). Never writes, generates or starts anything.
 *
 * @private project report
 */
export async function readLatestBrief(projectRoot: string): Promise<Pick<ReportView, 'path' | 'state' | 'brief' | 'problem'>> {
    const path = join(projectRoot, REPORT_FILE);
    const size = (await stat(path).catch(() => undefined))?.size;
    if (size === undefined) return { path: REPORT_FILE, state: 'missing' };
    try {
        let source: string;
        if (size <= TAIL_BYTES) source = await readFile(path, 'utf8');
        else {
            const handle = await open(path, 'r');
            try {
                const buffer = Buffer.alloc(TAIL_BYTES);
                await handle.read(buffer, 0, TAIL_BYTES, size - TAIL_BYTES);
                const tail = buffer.toString('utf8');
                // The tail from its first complete message, under a synthetic declaration (same parser, same chronology).
                const first = tail.search(/^CHAT MESSAGE /m);
                source = first >= 0 ? `${renderDeclaration('chat', REPORT_NAME)}\n${tail.slice(first)}` : '';
            } finally {
                await handle.close();
            }
        }
        const brief = source ? latestBriefOf(source) : undefined;
        return brief ? { path: REPORT_FILE, state: 'available', brief } : { path: REPORT_FILE, state: 'missing' };
    } catch (error) {
        return { path: REPORT_FILE, state: 'unreadable', problem: errorMessage(error) };
    }
}

/**
 * Appends one brief to root `report.book` (creating the Book on first use), atomically: a crash never leaves a partial
 * append that could hide the last good brief. Every earlier brief is preserved; nothing is compacted.
 *
 * @private project report
 */
export async function appendBrief(projectRoot: string, brief: ProjectBrief): Promise<string> {
    const path = join(projectRoot, REPORT_FILE);
    const source = (await readFile(path, 'utf8').catch(() => undefined)) ?? newReportBook();
    await writeFileAtomic(path, appendChatMessage(source, { sender: REPORT_AUTHOR, at: brief.at, text: brief.text }));
    return path;
}

/**
 * Finds the brief with an exact original time in the report (the snapshot a viewer displayed), reading the whole Book
 * once; undefined when it no longer exists.
 *
 * @private project report
 */
export async function findBrief(projectRoot: string, at: string): Promise<ProjectBrief | undefined> {
    const source = await readFile(join(projectRoot, REPORT_FILE), 'utf8').catch(() => undefined);
    if (source === undefined) return undefined;
    const message = parseChatBook(source).messages.find((candidate) => candidate.senderKey === 'chatter' && candidate.phase !== 'progress' && candidate.at === at);
    return message ? { text: message.text.trim(), at: message.at } : undefined;
}
