import { stat } from 'node:fs/promises';
import { findAgentReferences, normalizeAgentName, parseReferenceValue, referenceName } from '../../book/references.js';
import { parseDateTime } from '../../common/time.js';
import type { Agenda } from '../../engine/agenda.js';
import type { Task as Definition } from '../../tasks/model.js';
import { findTask } from '../../tasks/sources.js';
import { smartTaskOrder } from '../../tasks/views.js';
import { api, type ContractResponse } from '../../vendor/app-platform.js';

/** One read of the engine's own task sources, readiness and persisted runs. */
type Snapshot = Awaited<ReturnType<Agenda['taskReadSnapshot']>>;
/** Already validated route parameters and filters. */
type Request = { readonly params: Readonly<Record<string, unknown>>; readonly query: Readonly<Record<string, unknown>> };
/** The task fields needed for filtering and graph traversal, validated by the platform on output. */
type TaskView = Record<string, unknown> & { id: string; name: string; state: string; agentId: string | null; kind: string; parent: { taskId: string | null; name: string } | null };
/** Stable opaque transport IDs supplied by the common API adapter. */
type Id = (name: string) => string;
/** Paging is shared with every other API collection. */
type Page = (items: readonly unknown[], query: Readonly<Record<string, unknown>>) => ContractResponse;

/** A source timestamp in the project's time zone, without inventing an instant for an unknown legacy stamp. */
function timestamp(value: string | undefined, zone: string): string | null {
    if (!value) return null;
    const parsed = parseDateTime(value, zone);
    return parsed.ok ? new Date(parsed.epochMs).toISOString() : null;
}

/** Resolves task references with the same name/path/shadowing rules as the scheduler. */
function reference(value: string, snapshot: Snapshot, id: Id): { taskId: string | null; name: string } {
    const target = findTask(snapshot.tasks, value).task;
    return { taskId: target ? id(target.key) : null, name: (target?.title ?? referenceName(value)).slice(0, 512) || value.slice(0, 512) };
}

/** Whether following dependencies reaches the selected task again. */
function cyclic(from: Definition, target: Definition, snapshot: Snapshot): boolean {
    const pending = [target];
    const visited = new Set<string>();
    while (pending.length) {
        const current = pending.pop()!;
        if (current.key === from.key) return true;
        if (visited.has(current.key)) continue;
        visited.add(current.key);
        for (const value of current.dependsOn) {
            const next = findTask(snapshot.tasks, value).task;
            if (next) pending.push(next);
        }
    }
    return false;
}

/** Projects the authoritative readiness inventory, preserving its default order and separating definition ownership. */
async function project(snapshot: Snapshot, id: Id): Promise<TaskView[]> {
    const byKey = new Map(snapshot.tasks.map(task => [task.key, task]));
    return await Promise.all(smartTaskOrder(snapshot.inventory).map(async item => {
        const key = parseReferenceValue(item.ref)?.normalized ?? normalizeAgentName(item.title);
        const task = byKey.get(key);
        const agentName = item.kind === 'engine' ? null : item.agent ? referenceName(item.agent).slice(0, 256) : null;
        const agent = agentName ? snapshot.agents.find(agent => normalizeAgentName(agent.name) === normalizeAgentName(agentName)) : undefined;
        const dependsOn = (task?.dependsOn ?? []).slice(0, 200).map(value => {
            const ref = reference(value, snapshot, id);
            const target = findTask(snapshot.tasks, value).task;
            const state = !target ? 'missing' : cyclic(task!, target, snapshot) ? 'cycle' : target.status === 'done' ? 'met' : ['failed', 'cancelled', 'retired'].includes(target.status) ? 'failed' : 'pending';
            return { ...ref, state };
        });
        const originText = task?.origin ?? item.origin;
        const originRef = originText ? findAgentReferences(originText)[0] : undefined;
        const originBook = originRef ? snapshot.books.find(book => book.normalized === originRef.normalized) : undefined;
        const kind = item.kind ?? 'ordinary';
        const originKind = kind === 'engine' ? 'engine' : /^chat\b/i.test(originText ?? '') ? 'chat' : /^(task|assignment|learning|maintenance)\b/i.test(originText ?? '') ? 'task' : /^goal\b/i.test(originText ?? '') ? 'goal' : /^conversion\b/i.test(originText ?? '') ? 'conversion' : 'user';
        const conditions = dependsOn.map(dependency => ({ kind: 'dependency', met: dependency.state === 'met', text: `${dependency.name}: ${dependency.state}`.slice(0, 2048) }));
        if (task?.after !== undefined) conditions.unshift({ kind: 'not-before', met: Date.now() >= task.after, text: `Not before ${new Date(task.after).toISOString()}` });
        if (item.readiness === 'awaiting-user') conditions.push({ kind: 'answer', met: false, text: item.reason.slice(0, 2048) });
        const fileTime = task ? await stat(task.source.path).then(value => value.mtime.toISOString()).catch(() => null) : null;
        return {
            id: id(task?.key ?? key), name: item.title.slice(0, 512), kind, purpose: item.purpose ?? null, core: item.core ?? false,
            agentId: agent ? id(agent.key || normalizeAgentName(agent.name)) : null, agentName,
            executor: item.executor?.slice(0, 128) ?? null,
            priority: { rank: Math.max(0, Math.min(1_000_000, item.priority)), text: item.priorityText?.slice(0, 256) ?? null },
            state: item.readiness, stateReason: item.reason.slice(0, 2048) || null,
            next: ['active', 'ready', 'done', 'cancelled', 'retired'].includes(item.readiness) ? null : item.reason.slice(0, 2048) || null,
            conditions: conditions.slice(0, 100), repeat: task?.repeatMs ? { text: (task.repeatRaw ?? item.repeat ?? `${task.repeatMs / 1000}s`).slice(0, 128), intervalSeconds: Math.max(1, Math.floor(task.repeatMs / 1000)) } : null,
            notBefore: task?.after === undefined ? null : new Date(task.after).toISOString(), dueAt: timestamp(task?.due, snapshot.timeZone),
            nextAt: timestamp(item.until, snapshot.timeZone), progress: null,
            parent: task?.parent ? reference(task.parent, snapshot, id) : null, dependsOn,
            origin: originText || kind === 'engine' ? { kind: originKind, chatId: originBook?.kind === 'chat' ? originBook.name : null, taskId: originBook?.kind === 'task' ? id(originBook.normalized) : null, text: originText?.slice(0, 512) ?? null } : null,
            doneCount: item.doneCount, lastDoneAt: timestamp(item.lastDone, snapshot.timeZone), reopened: task?.reopened ?? false,
            sourcePath: kind === 'engine' ? null : (task?.source.relativePath.slice(0, 1024) ?? item.source.slice(0, 1024)) || null,
            allowedActions: [], updatedAt: fileTime ?? timestamp(item.runs?.[0]?.at ?? item.lastDone, snapshot.timeZone) ?? new Date(0).toISOString(),
        };
    }));
}

/** Explicit Book reference edges around one task, resolved against the shared winning Book index. */
function links(task: Definition | undefined, snapshot: Snapshot, id: Id): unknown[] {
    if (!task) return [];
    const result: unknown[] = [];
    const seen = new Set<string>();
    const add = (direction: string, kind: string, name: string, key: string, resolved: boolean): void => {
        const identity = `${direction}:${kind}:${key}`;
        if (seen.has(identity)) return;
        seen.add(identity);
        result.push({ direction, target: { type: kind, [`${kind}Id`]: resolved ? kind === 'chat' ? name : id(key) : null, name: name.slice(0, 512) } });
    };
    for (const book of snapshot.books) {
        for (const edge of findAgentReferences(book.document.lines.join('\n'))) {
            if (book.normalized === task.key) {
                const target = snapshot.books.find(candidate => candidate.normalized === edge.normalized);
                if (target && target.kind !== 'invalid') add('outgoing', target.kind, target.name, target.normalized, true);
                else if (snapshot.agents.some(agent => normalizeAgentName(agent.name) === edge.normalized)) add('outgoing', 'agent', edge.name, edge.normalized, true);
            } else if (edge.normalized === task.key && book.kind !== 'invalid') add('incoming', book.kind, book.name, book.normalized, true);
        }
    }
    return result.slice(0, 1000);
}

/** Retained execution evidence, with stable IDs derived from the run or completion stamp rather than timestamps alone. */
function occurrences(task: TaskView, snapshot: Snapshot, id: Id): unknown[] {
    const definition = snapshot.tasks.find(candidate => id(candidate.key) === task.id);
    const entries: Array<Record<string, unknown> & { id: string; endedAt: string | null; startedAt: string | null }> = [];
    const results = snapshot.results.filter(result => id(normalizeAgentName(result.taskName ?? result.title)) === task.id);
    for (const result of results) {
        const run = result.runId ?? `${result.startedAt}:${result.endedAt}:${result.title}`;
        entries.push({ id: id(`occurrence:${task.id}:${run}`), taskId: task.id, endedAt: result.endedAt, startedAt: result.startedAt,
            state: result.outcome === 'completed' || result.outcome === 'completed-uncommitted' ? 'completed' : result.outcome === 'interrupted' ? 'interrupted' : result.outcome === 'awaiting-user' || result.outcome === 'blocked' ? 'waiting' : result.outcome === 'skipped' ? 'cancelled' : 'failed',
            scheduledFor: timestamp(result.occurrence, snapshot.timeZone), summary: result.summary.slice(0, 1024), runIds: result.runId ? [id(result.runId)] : [] });
    }
    for (const [index, stamp] of (definition?.doneStamps ?? []).entries()) {
        const at = timestamp(stamp.split(/\s+/)[0], snapshot.timeZone);
        if (at && !entries.some(entry => entry.state === 'completed' && entry.endedAt && Date.parse(at) <= Date.parse(entry.endedAt) + 1000 && Date.parse(at) >= Date.parse(entry.startedAt ?? entry.endedAt))) {
            entries.push({ id: id(`completion:${task.id}:${index}:${stamp}`), taskId: task.id, state: 'completed', endedAt: at, startedAt: null, scheduledFor: null, summary: null, runIds: [] });
        }
    }
    for (const active of snapshot.active.filter(active => id(active.taskKey || normalizeAgentName(active.taskTitle)) === task.id)) {
        if (entries.some(entry => (entry.runIds as string[]).includes(id(active.runId)))) continue;
        entries.push({ id: id(`occurrence:${task.id}:${active.runId}`), taskId: task.id, state: active.phase.startsWith('awaiting-') ? 'waiting' : active.phase === 'failed' ? 'failed' : 'running',
            endedAt: null, startedAt: active.startedAt, scheduledFor: timestamp(active.occurrence, snapshot.timeZone), summary: null, runIds: [id(active.runId)] });
    }
    const inventory = snapshot.inventory.find(item => id(parseReferenceValue(item.ref)?.normalized ?? normalizeAgentName(item.title)) === task.id);
    for (const run of inventory?.runs ?? []) entries.push({ id: id(`system-occurrence:${task.id}:${run.at}:${run.title}`), taskId: task.id, state: run.outcome, startedAt: null, endedAt: run.at, scheduledFor: null, summary: run.detail.slice(0, 1024), runIds: [] });
    entries.sort((a, b) => (a.startedAt ?? a.endedAt ?? '').localeCompare(b.startedAt ?? b.endedAt ?? '') || a.id.localeCompare(b.id));
    let cycle = 1;
    return entries.map((entry, index) => {
        const previous = entries[index - 1];
        if (previous?.state === 'completed') cycle++;
        return { ...entry, sequence: index + 1, cycle, reason: previous?.state === 'failed' ? 'retry' : index === 0 ? 'first' : definition?.repeatMs ? 'repeat' : 'reopen', retryOf: previous?.state === 'failed' ? previous.id : null };
    }).reverse();
}

/**
 * The read-only `tasks@1` contract over the engine's own scheduler views and retained evidence. Writes still go through chat.
 * @private App task adapter
 */
export function taskHandlers(read: (includeHistory?: boolean) => Promise<Snapshot>, id: Id, page: Page): Readonly<Record<string, (input: Request) => Promise<ContractResponse>>> {
    return {
        listTasks: async ({ query }) => {
            const tasks = await project(await read(), id);
            const states = query.state as string[] | undefined;
            return page(tasks.filter(task => (!states || states.includes(task.state)) && (!query.kind || task.kind === query.kind) && (!query.agentId || task.agentId === query.agentId) && (!query.parentId || task.parent?.taskId === query.parentId) && (!query.q || task.name.toLocaleLowerCase().includes(String(query.q).toLocaleLowerCase()))), query);
        },
        getTask: async ({ params }) => {
            const snapshot = await read();
            const tasks = await project(snapshot, id);
            const task = tasks.find(task => task.id === params.taskId);
            if (!task) return { kind: 'problem', problem: api.createProblem('not-found') };
            const definition = snapshot.tasks.find(candidate => id(candidate.key) === task.id);
            const ref = (candidate: TaskView) => ({ taskId: candidate.id, name: candidate.name, state: candidate.state });
            return { kind: 'ok', data: { ...task, children: tasks.filter(candidate => candidate.parent?.taskId === task.id).slice(0, 1000).map(ref),
                blocks: tasks.filter(candidate => (candidate.dependsOn as Array<{ taskId: string | null }>).some(dependency => dependency.taskId === task.id)).slice(0, 1000).map(ref),
                links: links(definition, snapshot, id), notes: (definition?.notes ?? []).slice(0, 200).map(note => note.slice(0, 2048)) } };
        },
        listTaskOccurrences: async ({ params, query }) => {
            const snapshot = await read(true);
            const task = (await project(snapshot, id)).find(task => task.id === params.taskId);
            return task ? page(occurrences(task, snapshot, id), query) : { kind: 'problem', problem: api.createProblem('not-found') };
        },
    };
}
