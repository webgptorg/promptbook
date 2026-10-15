import { open, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, listDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { shortId } from '../common/ids.js';

/**
 * Maximal number of declared answers of one request.
 */
const MAX_CHOICES = 50;

/**
 * Maximal length of one declared answer.
 */
const MAX_CHOICE_LENGTH = 1000;

/**
 * Where a request came from (independent of the channel that answers it).
 *
 * @private user requests
 */
export type RequestOrigin = {
    /** Originating activity. */
    readonly kind: 'task' | 'setup' | 'recovery' | 'browser' | 'system';
    /** Affected task reference. */
    readonly taskRef?: string;
    /** Stable ID of the affected task (links the request to `traces/<task-id>/`). */
    readonly taskId?: string;
    /** Affected task title. */
    readonly taskTitle?: string;
    /** Asking agent. */
    readonly agent?: string;
    /** Recurring occurrence. */
    readonly occurrence?: string;
};

/**
 * Lifecycle state of a request.
 *
 * @private user requests
 */
export type RequestStatus = 'pending' | 'answered' | 'cancelled' | 'rejected' | 'expired' | 'unable';

/**
 * A durable question, confirmation or requested human action.
 *
 * @private user requests
 */
export type UserRequest = {
    /** Stable identifier (`r-xxxxxx`). */
    readonly id: string;
    /** Question, confirmation or action. */
    readonly kind: 'question' | 'confirmation' | 'action';
    /** Lifecycle state. */
    readonly status: RequestStatus;
    /** Why the user is needed. */
    readonly reason: string;
    /** What to answer or do. */
    readonly question: string;
    /** Safe resolution already attempted before involving the user. */
    readonly attempted?: string;
    /** Declared answers (open-ended when absent). */
    readonly choices?: readonly string[];
    /** Origin. */
    readonly origin: RequestOrigin;
    /** Blocks current work. */
    readonly blocking: boolean;
    /** Creation time (ISO). */
    readonly createdAt: string;
    /** Last change (ISO). */
    readonly updatedAt: string;
    /** Applied answer. */
    readonly answer?: string;
    /** Channel that resolved it. */
    readonly resolvedVia?: 'terminal' | 'browser' | 'api' | 'cli';
    /** The answer was delivered to the waiting work. */
    readonly consumed?: boolean;
};

/**
 * Input of a new request.
 *
 * @private user requests
 */
export type NewRequest = Pick<UserRequest, 'kind' | 'reason' | 'question' | 'origin' | 'blocking'> & { readonly choices?: readonly string[]; readonly attempted?: string };

/**
 * Validates declared answers: unique, readable, nonempty strings within the limits.
 *
 * @private user requests
 */
export function validateChoices(choices: unknown): string | undefined {
    if (choices === undefined || choices === null) return undefined;
    if (!Array.isArray(choices)) return 'Declared answers must be a list of strings.';
    if (choices.length > MAX_CHOICES) return `At most ${MAX_CHOICES} declared answers are allowed.`;
    const seen = new Set<string>();
    for (const choice of choices) {
        if (typeof choice !== 'string') return 'Every declared answer must be a string.';
        if (choice.length > MAX_CHOICE_LENGTH) return `A declared answer exceeds ${MAX_CHOICE_LENGTH} characters.`;
        // eslint-disable-next-line no-control-regex
        if (!choice.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, '')) return 'A declared answer must contain readable text.';
        if (seen.has(choice)) return `Duplicate declared answer "${choice}".`;
        seen.add(choice);
    }
    return undefined;
}

/**
 * File-based store of requests in `.ptbk/requests/` (survives disconnection and restarts).
 *
 * @private user requests
 */
export class RequestStore {
    public constructor(private readonly directory: string) {}

    /** Path of a request record. */
    private path(id: string): string {
        if (!/^r-[a-z0-9]+$/.test(id)) throw new PtbkError(`"${id}" is not a request identifier.`, { kind: 'usage', next: ['Run `ptbk answer` to list pending requests.'] });
        return join(this.directory, `${id}.json`);
    }

    /**
     * Creates and persists a pending request.
     *
     * Repeated reports of the same unresolved condition (same origin, question and answers) return the one pending
     * request instead of asking again.
     */
    public async create(input: NewRequest): Promise<UserRequest> {
        const problem = validateChoices(input.choices);
        if (problem) throw new PtbkError('The request has invalid declared answers.', { kind: 'usage', reason: problem });
        await ensureDirectory(this.directory);
        const duplicate = (await this.list({ status: 'pending' })).find(
            (existing) =>
                existing.origin.kind === input.origin.kind &&
                (existing.origin.taskId ?? existing.origin.taskRef) === (input.origin.taskId ?? input.origin.taskRef) &&
                existing.origin.occurrence === input.origin.occurrence &&
                existing.question.trim() === input.question.trim() &&
                JSON.stringify(existing.choices ?? []) === JSON.stringify(input.choices ?? []),
        );
        if (duplicate) return duplicate;
        const now = new Date().toISOString();
        const request: UserRequest = {
            id: `r-${shortId(6)}`,
            kind: input.kind,
            status: 'pending',
            reason: input.reason,
            question: input.question,
            attempted: input.attempted?.trim() || undefined,
            choices: input.choices?.length ? [...input.choices] : undefined,
            origin: input.origin,
            blocking: input.blocking,
            createdAt: now,
            updatedAt: now,
        };
        await writeJsonAtomic(this.path(request.id), request);
        return request;
    }

    /** Reads one request (validating persisted declared answers). */
    public async get(id: string): Promise<UserRequest | undefined> {
        const request = await readJsonIfExists<UserRequest>(this.path(id));
        if (request && validateChoices(request.choices)) return { ...request, choices: undefined };
        return request;
    }

    /** Lists requests, blocking and oldest first. */
    public async list(filter: { status?: RequestStatus } = {}): Promise<UserRequest[]> {
        const requests: UserRequest[] = [];
        for (const entry of await listDirectory(this.directory)) {
            if (!entry.isFile || !/^r-[a-z0-9]+\.json$/.test(entry.name)) continue;
            try {
                const request = JSON.parse(await readFile(join(this.directory, entry.name), 'utf8')) as UserRequest;
                if (!filter.status || request.status === filter.status) requests.push(validateChoices(request.choices) ? { ...request, choices: undefined } : request);
            } catch {
                // A partially written record is ignored until it is complete.
            }
        }
        return requests.sort((a, b) => Number(b.blocking) - Number(a.blocking) || a.createdAt.localeCompare(b.createdAt));
    }

    /**
     * Applies a resolution exactly once; a late or conflicting resolution is rejected with an explanation.
     */
    public async resolve(id: string, resolution: { status: Exclude<RequestStatus, 'pending'>; answer?: string; via: UserRequest['resolvedVia'] }): Promise<UserRequest> {
        const lockPath = `${this.path(id)}.lock`;
        let handle;
        try {
            handle = await open(lockPath, 'wx');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
                throw new PtbkError(`Request ${id} is being resolved by another channel.`, { kind: 'conflict', next: ['Refresh and check its state.'] });
            }
            throw error;
        }
        try {
            const request = await this.get(id);
            if (!request) throw new PtbkError(`Request ${id} does not exist.`, { kind: 'not-found', next: ['Run `ptbk answer` to list pending requests.'] });
            if (request.status !== 'pending') {
                throw new PtbkError(`Request ${id} was already ${request.status}${request.resolvedVia ? ` via ${request.resolvedVia}` : ''}.`, {
                    kind: 'conflict',
                    reason: request.answer !== undefined ? `Recorded answer: ${request.answer}` : undefined,
                    effect: 'This late answer was not applied.',
                });
            }
            if (resolution.status === 'answered') {
                const answer = resolution.answer ?? '';
                if (!answer.trim()) throw new PtbkError('An answer cannot be empty.', { kind: 'usage' });
                if (request.choices?.length && !request.choices.includes(answer)) {
                    throw new PtbkError(`"${answer}" is not one of the declared answers.`, { kind: 'usage', reason: `Choose one of: ${request.choices.join(' | ')}` });
                }
            }
            const updated: UserRequest = { ...request, status: resolution.status, answer: resolution.answer, resolvedVia: resolution.via, updatedAt: new Date().toISOString() };
            await writeJsonAtomic(this.path(id), updated);
            return updated;
        } finally {
            await handle.close();
            await rm(lockPath, { force: true });
        }
    }

    /** Marks a resolved request as delivered to its waiting work. */
    public async markConsumed(id: string): Promise<void> {
        const request = await this.get(id);
        if (request && !request.consumed) await writeJsonAtomic(this.path(id), { ...request, consumed: true, updatedAt: new Date().toISOString() });
    }

    /** Cancels pending requests of a task (e.g. when the task disappeared), recording the cancellation. */
    public async cancelForTask(taskRef: string, reason: string): Promise<void> {
        for (const request of await this.list({ status: 'pending' })) {
            if (request.origin.taskRef === taskRef) await this.resolve(request.id, { status: 'cancelled', answer: reason, via: undefined }).catch(() => undefined);
        }
    }
}
