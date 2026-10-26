import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listDirectory } from '../common/fs.js';
import { formatAgentReference, referenceName } from '../book/references.js';
import type { Project } from '../project/workspace.js';
import type { ActiveRecord, StateStore } from '../engine/state.js';
import type { ChatStore } from './store.js';

/**
 * A pending request record written by an older engine (`.ptbk/requests/r-*.json`).
 */
type LegacyRequest = {
    readonly id: string;
    readonly status: string;
    readonly kind?: string;
    readonly reason?: string;
    readonly question: string;
    readonly choices?: readonly string[];
    readonly attempted?: string;
    readonly origin?: { readonly kind?: string; readonly taskTitle?: string; readonly agent?: string };
};

/**
 * Fields of runtime records from older engines that referred to requests.
 */
type LegacyRecordFields = { readonly requestId?: string; readonly recoveryRequestId?: string };

/**
 * Upgrades pending request records of older engines into agent-authored chats waiting for the user, once.
 *
 * The original agent, reason, answer options and task wait state are kept; nothing is answered on the user's behalf.
 * Returns the number of migrated requests.
 *
 * @private chats
 */
export async function migrateLegacyRequests(project: Project, chats: ChatStore, state: StateStore, takenNames: () => ReadonlySet<string>): Promise<number> {
    let migrated = 0;
    const parked = await state.readParked();
    const active = await state.readActiveRecords();
    const records = [...parked, ...active];
    for (const entry of await listDirectory(project.runtime.requests)) {
        if (!entry.isFile || !/^r-[a-z0-9]+\.json$/.test(entry.name)) continue;
        const path = join(project.runtime.requests, entry.name);
        let request: LegacyRequest;
        try {
            request = JSON.parse(await readFile(path, 'utf8')) as LegacyRequest;
        } catch {
            continue;
        }
        if (request.status !== 'pending') continue;
        const agent = referenceName(request.origin?.agent ?? 'Fixer');
        const created = await chats.create({
            name: `${agent} asks: ${request.question.split('\n')[0]!.slice(0, 70)}`,
            members: ['@User', formatAgentReference(agent)],
            status: 'waiting-for-user',
            links: request.origin?.taskTitle ? [`{${request.origin.taskTitle}}`] : [],
            messages: [{ sender: formatAgentReference(agent), text: [request.reason, request.attempted ? `Already attempted: ${request.attempted}` : undefined, request.question].filter(Boolean).join('\n\n'), choices: request.choices?.length ? request.choices : undefined }],
            taken: takenNames(),
            trailers: request.origin?.taskTitle ? { 'Task-Name': request.origin.taskTitle } : undefined,
        });
        for (const record of records) {
            const legacy = record as ActiveRecord & LegacyRecordFields;
            const updates: Partial<ActiveRecord> = {};
            if (legacy.requestId === request.id) Object.assign(updates, { waitingChat: created.chat.name, awaitedMessages: created.chat.messages.length, chats: [...(record.chats ?? []), created.chat.name] });
            if (legacy.recoveryRequestId === request.id) Object.assign(updates, { recoveryChat: created.chat.name, awaitedMessages: created.chat.messages.length });
            if (!Object.keys(updates).length) continue;
            const updated = { ...record, ...updates } as ActiveRecord;
            if (active.includes(record)) await state.writeActive(updated);
            else await state.writeParked(updated);
        }
        await writeFile(path, `${JSON.stringify({ ...request, status: 'cancelled', answer: `Migrated to the chat {${created.chat.name}}.` }, null, 2)}\n`);
        migrated++;
    }
    return migrated;
}
