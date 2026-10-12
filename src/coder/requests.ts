import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, readdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Workspace } from './domain.js';
import { confinePath, InputError } from './workspace.js';
import { redactSecrets } from './harness.js';

/** A durable question, decision or human action shared by all interaction channels. @private */
export interface UserRequest {
    version: 1; id: string; project: string; taskId?: string; activityId?: string; kind: 'question' | 'confirmation' | 'action';
    reason: string; prompt: string; choices?: string[]; createdAt: string;
    status: 'pending' | 'answered' | 'rejected' | 'cancelled'; response?: string; answeredAt?: string;
}
/** Immutable answer records make concurrent answers resolve exactly once. @private */
interface Answer { response: string; status: UserRequest['status']; answeredAt: string; }

/** Validate opaque request IDs before mapping them to filesystem paths. @private */
function assertId(id: string): void { if (!/^[a-f0-9]{32}$/.test(id)) throw new InputError('Invalid request ID.'); }

/** Require each declared answer to remain readable and uniquely selectable without rewriting its value. */
function assertChoices(choices: unknown, message = 'Request choices require at most 50 unique readable strings, each 1–1000 characters.'): void {
    if (choices === undefined) return;
    if (!Array.isArray(choices) || choices.length > 50) throw new InputError(message);
    const values = new Set<string>();
    for (const choice of choices) {
        if (typeof choice !== 'string' || choice.length > 1000 || !choice.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || values.has(choice)) throw new InputError(message);
        values.add(choice);
    }
}

/** Publish a complete immutable record atomically so a crash cannot expose partial JSON. */
async function writeImmutable(workspace: Workspace, target: string, value: unknown): Promise<void> {
    const temporary = await confinePath(workspace.projectPath, `${target}.${randomUUID()}.tmp`);
    try {
        const file = await open(temporary, 'wx', 0o600);
        try { await file.writeFile(`${JSON.stringify(value, null, 2)}\n`); await file.sync(); }
        finally { await file.close(); }
        await confinePath(workspace.projectPath, target);
        // An atomic hard link gives exactly one winner without overwriting an existing answer.
        await link(temporary, target);
        const directory = await open(dirname(target), 'r').catch(() => undefined);
        if (directory) { try { await directory.sync().catch(() => {}); } finally { await directory.close(); } }
    } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
}

/** Read requests and their immutable answer records without creating runtime storage. @private */
export async function listRequests(workspace: Workspace, pendingOnly = false): Promise<UserRequest[]> {
    const directory = await confinePath(workspace.projectPath, join(workspace.statePath, 'requests'));
    let names: string[];
    try { names = await readdir(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    const requests: UserRequest[] = [];
    for (const name of names.filter(name => /^[a-f0-9]{32}\.json$/.test(name)).sort()) {
        const request = JSON.parse(await readFile(await confinePath(workspace.projectPath, join(directory, name)), 'utf8')) as UserRequest;
        assertId(request.id);
        if (request.version !== 1 || request.project !== workspace.projectPath || `${request.id}.json` !== name || !['question', 'confirmation', 'action'].includes(request.kind) || request.status !== 'pending' || typeof request.prompt !== 'string' || typeof request.reason !== 'string' || typeof request.createdAt !== 'string') throw new InputError('Invalid request record; preserved for investigation.');
        assertChoices(request.choices, 'Invalid request choices; preserved for investigation.');
        try {
            const answer = JSON.parse(await readFile(await confinePath(workspace.projectPath, join(directory, `${request.id}.answer.json`)), 'utf8')) as Answer;
            if (!['answered', 'rejected', 'cancelled'].includes(answer.status) || typeof answer.response !== 'string' || typeof answer.answeredAt !== 'string') throw new InputError('Invalid immutable answer; preserved for investigation.');
            Object.assign(request, answer);
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (!pendingOnly || request.status === 'pending') requests.push(request);
    }
    return requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Create or reuse one unresolved request for the same originating question. @private */
export async function createRequest(workspace: Workspace, input: Pick<UserRequest, 'kind' | 'reason' | 'prompt' | 'taskId' | 'activityId' | 'choices'>): Promise<UserRequest> {
    if (!['question', 'confirmation', 'action'].includes(input.kind) || typeof input.prompt !== 'string' || typeof input.reason !== 'string' || !input.prompt.trim() || !input.reason.trim() || input.prompt.length > 128_000 || input.reason.length > 128_000) throw new InputError('A user request requires its kind, reason and 1–128000 character question/action.');
    assertChoices(input.choices);
    const content = { ...input, prompt: redactSecrets(input.prompt, workspace.projectPath), reason: redactSecrets(input.reason, workspace.projectPath), ...(input.choices ? { choices: input.choices.map(choice => redactSecrets(choice, workspace.projectPath)) } : {}) };
    assertChoices(content.choices);
    const id = createHash('sha256').update(JSON.stringify({ project: workspace.projectPath, ...content })).digest('hex').slice(0, 32);
    const existing = (await listRequests(workspace)).find(request => request.id === id);
    if (existing) return existing;
    const request: UserRequest = { version: 1, id, project: workspace.projectPath, ...content, createdAt: new Date().toISOString(), status: 'pending' };
    const directory = await confinePath(workspace.projectPath, join(workspace.statePath, 'requests'));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    try { await writeImmutable(workspace, await confinePath(workspace.projectPath, join(directory, `${id}.json`)), request); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    return (await listRequests(workspace)).find(item => item.id === id)!;
}

/** Apply a reply once without needing the task's mutation lease or HTTP server. @private */
export async function answerRequest(workspace: Workspace, id: string, response: string, status: 'answered' | 'rejected' | 'cancelled' = 'answered'): Promise<UserRequest> {
    assertId(id);
    if (!['answered', 'rejected', 'cancelled'].includes(status)) throw new InputError('Reply status must be answered, rejected or cancelled.');
    const request = (await listRequests(workspace)).find(item => item.id === id);
    if (!request) throw new InputError(`Unknown request ${id}.`);
    if (request.status !== 'pending') throw new InputError(`Request ${id} was already ${request.status}; no second answer was applied.`);
    if (!response.trim() || response.length > 128_000) throw new InputError('A reply requires 1–128000 characters.');
    const answer: Answer = { response: redactSecrets(response, workspace.projectPath), status, answeredAt: new Date().toISOString() };
    const target = await confinePath(workspace.projectPath, join(workspace.statePath, 'requests', `${id}.answer.json`));
    try { await writeImmutable(workspace, target, answer); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError(`Request ${id} already received a concurrent answer.`); throw error; }
    return { ...request, ...answer };
}

/** Await a durable response; cancellation and rejection are distinct from approval. @private */
export async function waitForAnswer(workspace: Workspace, id: string, signal?: AbortSignal): Promise<string> {
    for (;;) {
        const request = (await listRequests(workspace)).find(item => item.id === id);
        if (!request) throw new InputError(`Request ${id} disappeared; work remains unfinished.`);
        if (request.status === 'answered') return request.response!;
        if (request.status !== 'pending') throw new InputError(`Request ${id} was ${request.status}.`);
        await delay(500, undefined, { signal });
    }
}
